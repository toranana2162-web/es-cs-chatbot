import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createAnonClient,
  createTestOperator,
  deleteTestOperator,
} from "../helpers/create-test-operator";

// SECURITY.md §8 / TEST_PLAN.md §4に基づくRLS境界の実地検証。
// 実際のSupabaseプロジェクトに対して、顧客A/顧客B/オペレーター/未認証それぞれの
// セッションでRLSが期待通りに機能しているかを確認する。

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const cleanupConversationIds: string[] = [];
const cleanupOperatorIds: string[] = [];

afterEach(async () => {
  while (cleanupConversationIds.length > 0) {
    const id = cleanupConversationIds.pop()!;
    await admin.from("messages").delete().eq("conversation_id", id);
    await admin.from("conversations").delete().eq("id", id);
  }
  while (cleanupOperatorIds.length > 0) {
    const id = cleanupOperatorIds.pop()!;
    await deleteTestOperator(admin, id);
  }
});

async function signedInCustomer() {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(`Failed to sign in test customer: ${error?.message}`);
  }
  return { client, userId: data.user.id };
}

async function seedConversationWithMessage(customerUserId: string) {
  const { data: conversation, error } = await admin
    .from("conversations")
    .insert({ customer_user_id: customerUserId })
    .select("id")
    .single();
  if (error || !conversation) {
    throw new Error(`Failed to seed conversation: ${error?.message}`);
  }
  cleanupConversationIds.push(conversation.id);

  await admin.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "customer",
    sender_id: customerUserId,
    content: "これは顧客Aの会話内容です。",
  });

  return conversation.id as string;
}

describe("RLS boundaries (live)", () => {
  it("顧客Aは顧客Bの会話をSELECTできない", async () => {
    const customerA = await signedInCustomer();
    const customerB = await signedInCustomer();
    const conversationId = await seedConversationWithMessage(customerA.userId);

    const { data, error } = await customerB.client
      .from("conversations")
      .select("*")
      .eq("id", conversationId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("顧客Aは顧客Bの会話IDを直接指定してもmessagesを読めない", async () => {
    const customerA = await signedInCustomer();
    const customerB = await signedInCustomer();
    const conversationId = await seedConversationWithMessage(customerA.userId);

    const { data, error } = await customerB.client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("顧客Bは顧客Aの会話IDを指定してメッセージをINSERTできない", async () => {
    const customerA = await signedInCustomer();
    const customerB = await signedInCustomer();
    const conversationId = await seedConversationWithMessage(customerA.userId);

    const { error } = await customerB.client.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      sender_id: customerB.userId,
      content: "なりすまし投稿",
    });

    // RLSのwith check違反によりinsertは拒否される
    expect(error).not.toBeNull();
  });

  it("未認証（匿名サインインすらしていない）クライアントはconversationsを読めない", async () => {
    const unauthenticated = createAnonClient();
    const customerA = await signedInCustomer();
    await seedConversationWithMessage(customerA.userId);

    const { data, error } = await unauthenticated
      .from("conversations")
      .select("*");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("operator_profiles未登録の一般認証ユーザーはオペレーター権限を持たない（他会話を読めない）", async () => {
    const customerA = await signedInCustomer();
    const generalUser = await signedInCustomer(); // operator_profilesには登録しない
    await seedConversationWithMessage(customerA.userId);

    const { data, error } = await generalUser.client
      .from("conversations")
      .select("*");

    expect(error).toBeNull();
    // 自分自身の会話も作っていないため0件。他人の会話が見えていないことが重要。
    expect(data).toEqual([]);
  });

  it("オペレーターは全顧客の会話をSELECTできる", async () => {
    const customerA = await signedInCustomer();
    const conversationId = await seedConversationWithMessage(customerA.userId);

    const operator = await createTestOperator(admin);
    cleanupOperatorIds.push(operator.userId);
    const operatorClient = createAnonClient();
    await operatorClient.auth.signInWithPassword({
      email: operator.email,
      password: operator.password,
    });

    const { data, error } = await operatorClient
      .from("conversations")
      .select("*")
      .eq("id", conversationId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("認証済み顧客はfaqsテーブルへ直接SELECTできない（サーバー処理経由のみ）", async () => {
    const customerA = await signedInCustomer();

    const { data, error } = await customerA.client.from("faqs").select("*");

    // RLSポリシーが存在しないためデフォルト拒否。エラーではなく0件で返る場合もある。
    expect(error === null ? data : []).toEqual([]);
  });

  it("認証済み顧客はbusiness_holidaysテーブルへ直接SELECTできない", async () => {
    const customerA = await signedInCustomer();

    const { data, error } = await customerA.client
      .from("business_holidays")
      .select("*");

    expect(error === null ? data : []).toEqual([]);
  });

  // 既知の設計上の弱点（このテストで発見、意図的な仕様ではない）:
  // messagesのINSERTポリシー「operators can send operator messages」は
  // sender_type='operator' かつ sender_id=auth.uid() かつ is_operator() のみを見ており、
  // assigned_operator_idとの一致を要求しない。つまりRLSレベルでは、担当外のオペレーターでも
  // 他のオペレーターが担当中の会話へメッセージを挿入できてしまう。
  // 現状はsend-operator-message.ts（アプリ層）のみがこの制約を守っており、RLSは
  // 防御になっていない。2名体制のMVPでは実害は限定的だが、多店舗展開等で
  // オペレーターが増えた場合は要修正。
  it("[既知の弱点] 担当外のオペレーターでもRLS上はmessagesへINSERTできてしまう", async () => {
    const customerA = await signedInCustomer();
    const conversationId = await seedConversationWithMessage(customerA.userId);

    const assignedOperator = await createTestOperator(admin);
    const otherOperator = await createTestOperator(admin);
    cleanupOperatorIds.push(assignedOperator.userId, otherOperator.userId);

    await admin
      .from("conversations")
      .update({
        status: "operator_handling",
        assigned_operator_id: assignedOperator.userId,
      })
      .eq("id", conversationId);

    const otherOperatorClient = createAnonClient();
    await otherOperatorClient.auth.signInWithPassword({
      email: otherOperator.email,
      password: otherOperator.password,
    });

    const { error } = await otherOperatorClient.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "operator",
      sender_id: otherOperator.userId,
      content: "担当外だが挿入できてしまう",
    });

    // 現状の仕様: RLSレベルではエラーにならない（アプリ層のみでガードされている）
    expect(error).toBeNull();
  });
});
