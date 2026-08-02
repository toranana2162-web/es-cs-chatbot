import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  createAnonClient,
  createTestOperator,
  deleteTestOperator,
} from "../helpers/create-test-operator";

// Phase 5統合: claim-conversation.ts / send-operator-message.tsが行うのと同じRLS経由の
// 操作を、実際のオペレーターセッション（既知パスワードの使い捨てアカウント）で再現し、
// 「エスカレーション発生→担当開始→返信→顧客側から読める」までを検証する。
// requireOperator()自体はnext/headers依存のためNode単体では呼べないが、その内部で
// 行われるSupabase呼び出しは同一のRLSポリシーを通るため、この経路で実質的に検証できる。

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

async function createEscalatedConversation(): Promise<{
  conversationId: string;
  customer: ReturnType<typeof createAnonClient>;
  customerUserId: string;
}> {
  const customer = createAnonClient();
  const { data: authData, error: authError } =
    await customer.auth.signInAnonymously();
  if (authError || !authData.user) {
    throw new Error(`Failed to sign in test customer: ${authError?.message}`);
  }

  // AI判定ロジック自体は既にPhase 3で検証済みのため、ここではwaiting_operatorの
  // 会話をadmin clientで直接用意し、オペレーター側フローの検証に専念する。
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .insert({
      customer_user_id: authData.user.id,
      status: "waiting_operator",
      escalated_reason: "customer_request",
    })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    throw new Error(
      `Failed to create conversation: ${conversationError?.message}`,
    );
  }
  cleanupConversationIds.push(conversation.id);

  await admin.from("messages").insert({
    conversation_id: conversation.id,
    sender_type: "customer",
    sender_id: authData.user.id,
    content: "担当者に確認してほしいことがあります。",
  });

  return {
    conversationId: conversation.id,
    customer,
    customerUserId: authData.user.id,
  };
}

describe("operator reply flow (live, RLS経由)", () => {
  it("オペレーターが担当開始し返信すると、顧客セッションから返信を読める", async () => {
    const { conversationId, customer } = await createEscalatedConversation();

    const operator = await createTestOperator(admin);
    cleanupOperatorIds.push(operator.userId);

    const operatorClient = createAnonClient();
    const { error: signInError } = await operatorClient.auth.signInWithPassword(
      {
        email: operator.email,
        password: operator.password,
      },
    );
    expect(signInError).toBeNull();

    // claim-conversation.tsと同じ経路: claim_conversation RPCをオペレーター自身の
    // セッションで呼ぶ（D-008、原子的更新）
    const { data: claimed, error: claimError } = await operatorClient.rpc(
      "claim_conversation",
      { p_conversation_id: conversationId, p_operator_id: operator.userId },
    );
    expect(claimError).toBeNull();
    expect(claimed).toBeTruthy();
    expect(claimed.status).toBe("operator_handling");
    expect(claimed.assigned_operator_id).toBe(operator.userId);

    // send-operator-message.tsと同じ経路: 担当者自身のセッションでmessagesへinsert
    const { error: replyError } = await operatorClient.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "operator",
      sender_id: operator.userId,
      content: "担当者が確認いたしました。",
    });
    expect(replyError).toBeNull();

    // 顧客のRLSセッションから、オペレーターの返信を読めることを確認する
    // （顧客ウィジェットのRealtime購読が実際に受け取れる状態と同じ）
    const { data: messages } = await customer
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    expect(messages).toHaveLength(2);
    expect(messages![1].sender_type).toBe("operator");
    expect(messages![1].content).toBe("担当者が確認いたしました。");
  }, 30_000);

  it("2名のオペレーターがほぼ同時に担当開始しても、先着1名だけが担当者になる（D-008、実セッション）", async () => {
    const { conversationId } = await createEscalatedConversation();

    const operatorA = await createTestOperator(admin);
    const operatorB = await createTestOperator(admin);
    cleanupOperatorIds.push(operatorA.userId, operatorB.userId);

    const clientA = createAnonClient();
    const clientB = createAnonClient();
    await clientA.auth.signInWithPassword({
      email: operatorA.email,
      password: operatorA.password,
    });
    await clientB.auth.signInWithPassword({
      email: operatorB.email,
      password: operatorB.password,
    });

    const [resultA, resultB] = await Promise.all([
      clientA.rpc("claim_conversation", {
        p_conversation_id: conversationId,
        p_operator_id: operatorA.userId,
      }),
      clientB.rpc("claim_conversation", {
        p_conversation_id: conversationId,
        p_operator_id: operatorB.userId,
      }),
    ]);

    // claim_conversationは該当行がない場合、PostgRESTの単一行RPCの仕様上
    // nullではなく全フィールドnullのオブジェクトを返す。真に成功したかは.idの有無で判定する
    // （claim-conversation.tsの実装と同じ判定方法）。
    const succeededCount = [resultA.data, resultB.data].filter(
      (data) => data && data.id,
    ).length;
    expect(succeededCount).toBe(1);

    const { data: finalConversation } = await admin
      .from("conversations")
      .select("assigned_operator_id, status")
      .eq("id", conversationId)
      .single();

    expect([operatorA.userId, operatorB.userId]).toContain(
      finalConversation!.assigned_operator_id,
    );
    expect(finalConversation!.status).toBe("operator_handling");
  }, 30_000);
});
