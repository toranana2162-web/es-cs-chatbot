import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { respondWithAi } from "@/actions/respond-with-ai";

// Phase 5統合: 実際の匿名認証セッションでRLSを通した顧客メッセージ挿入を行い
// （send-customer-message.tsが行うのと同じ経路）、続けてrespondWithAiを呼び出すことで、
// 「顧客が送信→AIが応答する」という一連の流れが実際に動作することを検証する。
// send-customer-message.ts自体はnext/headers（cookies）に依存するためNode単体では
// 直接呼び出せず、RLSを通す部分はこのテストで直接再現する。

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const createdConversationIds: string[] = [];

afterEach(async () => {
  while (createdConversationIds.length > 0) {
    const id = createdConversationIds.pop()!;
    await admin.from("messages").delete().eq("conversation_id", id);
    await admin.from("conversations").delete().eq("id", id);
  }
});

describe("customer -> AI flow (live, RLS経由)", () => {
  it("匿名認証した顧客がFAQに合致するメッセージを送ると、AIの回答がRealtime相当の経路で保存される", async () => {
    // 1. 実際のウィジェットと同じ経路: anon keyクライアントで匿名サインイン
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: authData, error: authError } =
      await anon.auth.signInAnonymously();
    expect(authError).toBeNull();
    const customerUserId = authData.user!.id;

    // 2. send-customer-message.tsと同じ経路（顧客自身のRLSセッション）で会話・
    // メッセージを作成する。RLSにより自分のcustomer_user_idでのみ作成できることを
    // 実際に検証する。
    const { data: conversation, error: conversationError } = await anon
      .from("conversations")
      .insert({ customer_user_id: customerUserId })
      .select("id")
      .single();
    expect(conversationError).toBeNull();
    const conversationId = conversation!.id as string;
    createdConversationIds.push(conversationId);

    const { error: messageError } = await anon.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      sender_id: customerUserId,
      content: "送料はいくらですか？",
    });
    expect(messageError).toBeNull();

    // 3. send-customer-message.tsが後続で呼ぶrespondWithAiを実行する
    const result = await respondWithAi(conversationId);
    expect(result.success).toBe(true);

    // 4. AIの回答メッセージが保存され、顧客のRLSセッションからも読めることを確認する
    // （顧客ウィジェットのRealtime購読が実際に受け取れる状態と同じ）
    const { data: messages, error: readError } = await anon
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    expect(readError).toBeNull();
    expect(messages).toHaveLength(2);
    expect(messages![0].sender_type).toBe("customer");
    expect(messages![1].sender_type).toBe("ai");
    expect(messages![1].content.length).toBeGreaterThan(0);

    const { data: updatedConversation } = await anon
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();
    expect(updatedConversation!.status).toBe("ai_handling");
  }, 30_000);
});
