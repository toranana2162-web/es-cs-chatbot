import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { respondWithAi } from "@/actions/respond-with-ai";
import { loadTestConversations } from "../fixtures/load-test-conversations";
import { resolveBusinessContextToNow } from "../helpers/business-context";
import type { TestConversationScenario } from "../fixtures/load-test-conversations";

// 実際のSupabaseプロジェクト・Claude API・OpenAI Embeddings APIに対して
// test-conversations.jsonのシナリオを流す統合テスト（TEST_PLAN.md シナリオ1〜9・12）。
// シナリオ10（オペレーター同時担当）はAIバックエンドの対象外のため除外する。
// LLM呼び出しを含むため各テストの実行に数秒〜十数秒かかる。

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const createdConversationIds: string[] = [];

afterEach(async () => {
  while (createdConversationIds.length > 0) {
    const id = createdConversationIds.pop()!;
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
  }
});

async function createTestCustomer(): Promise<string> {
  const email = `test-ai-backend-${crypto.randomUUID()}@example.com`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test customer: ${error?.message}`);
  }
  return data.user.id;
}

async function seedConversation(scenario: TestConversationScenario) {
  const customerUserId = await createTestCustomer();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({ customer_user_id: customerUserId })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    throw new Error(
      `Failed to create conversation: ${conversationError?.message}`,
    );
  }
  createdConversationIds.push(conversation.id);

  for (const message of scenario.input ?? []) {
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: message.sender,
      sender_id: message.sender === "customer" ? customerUserId : null,
      content: message.message,
    });
  }

  return conversation.id as string;
}

async function assertConversationMatchesExpected(
  conversationId: string,
  scenario: TestConversationScenario,
) {
  const { data: updatedConversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  expect(updatedConversation.status).toBe(scenario.expected.status);
  expect(updatedConversation.is_after_hours).toBe(
    scenario.expected.is_after_hours,
  );

  if (scenario.expected.escalate) {
    expect(updatedConversation.escalated_reason).not.toBeNull();
  } else {
    expect(updatedConversation.escalated_reason).toBeNull();
  }

  const { data: aiMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("sender_type", "ai")
    .order("created_at", { ascending: false })
    .limit(1);

  expect(aiMessages).toHaveLength(1);
  expect(aiMessages![0].content.length).toBeGreaterThan(0);
}

const allScenarios = loadTestConversations();
// scenario-07はオペレーター返信を含むPhase 5統合シナリオでありAIバックエンド単体の対象外、
// scenario-09はClaude API障害を模擬する必要があるため専用テストで扱い、
// scenario-10はオペレーター同時担当（AIバックエンドの対象外）のため、それぞれ除外する。
const EXCLUDED_FROM_NORMAL = ["scenario-07", "scenario-09", "scenario-10"];
const normalScenarios = allScenarios.filter(
  (scenario) => !EXCLUDED_FROM_NORMAL.includes(scenario.id),
);
const apiFailureScenario = allScenarios.find(
  (scenario) => scenario.id === "scenario-09",
)!;

describe("respondWithAi (live integration)", () => {
  it.each(normalScenarios.map((scenario) => [scenario.id, scenario] as const))(
    "%s: %s",
    async (_id, scenario) => {
      const conversationId = await seedConversation(scenario);
      const now = resolveBusinessContextToNow(scenario.business_context);

      const result = await respondWithAi(conversationId, now);

      expect(result.success).toBe(true);
      await assertConversationMatchesExpected(conversationId, scenario);
    },
    30_000,
  );

  it("scenario-09: Claude API障害", async () => {
    const conversationId = await seedConversation(apiFailureScenario);
    const now = resolveBusinessContextToNow(
      apiFailureScenario.business_context,
    );

    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "invalid-key-for-testing";

    try {
      const result = await respondWithAi(conversationId, now);
      expect(result.success).toBe(true);
      expect(result.escalated).toBe(true);
    } finally {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }

    const { data: updatedConversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    expect(updatedConversation.status).toBe("waiting_operator");
    expect(updatedConversation.escalated_reason).toBe("ai_api_error");

    const { data: aiMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "ai");

    expect(aiMessages).toHaveLength(1);
  }, 30_000);

  // 2026-08-06: エスカレーション済み会話への追加メッセージにsystem通知を出す機能の検証
  it.each([
    ["waiting_operator" as const],
    ["operator_handling" as const],
  ])(
    "%sの会話へ追加メッセージが来た場合、systemメッセージで受付を通知しai_handlingへは戻さない",
    async (status) => {
      const customerUserId = await createTestCustomer();
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({ customer_user_id: customerUserId, status })
        .select("id")
        .single();
      if (error || !conversation) {
        throw new Error(`Failed to seed conversation: ${error?.message}`);
      }
      createdConversationIds.push(conversation.id);

      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_type: "customer",
        sender_id: customerUserId,
        content: "追加の質問です",
      });

      const result = await respondWithAi(conversation.id);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);

      const { data: updatedConversation } = await supabase
        .from("conversations")
        .select("status")
        .eq("id", conversation.id)
        .single();
      expect(updatedConversation!.status).toBe(status);

      const { data: systemMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .eq("sender_type", "system");
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages![0].content).toContain("お待ちください");
    },
    15_000,
  );

  it("closedの会話へ追加メッセージが来てもsystemメッセージは挿入しない", async () => {
    const customerUserId = await createTestCustomer();
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ customer_user_id: customerUserId, status: "closed" })
      .select("id")
      .single();
    if (error || !conversation) {
      throw new Error(`Failed to seed conversation: ${error?.message}`);
    }
    createdConversationIds.push(conversation.id);

    const result = await respondWithAi(conversation.id);
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);

    const { data: systemMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .eq("sender_type", "system");
    expect(systemMessages).toHaveLength(0);
  }, 15_000);
});
