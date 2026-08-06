"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/create-admin-client";
import { isAfterHours } from "@/lib/business-hours/is-after-hours";
import { getBusinessHolidays } from "@/lib/business-hours/get-holidays";
import { searchFaqs } from "@/features/faq/search-faqs";
import { callClaude } from "@/features/ai/claude-client";
import {
  validateAiResponse,
  type ValidatedAiResponse,
} from "@/features/ai/validate-response";
import type { ConversationStatus, Message, SenderType } from "@/types/domain";

export interface RespondWithAiResult {
  success: boolean;
  skipped?: boolean;
  escalated?: boolean;
}

interface ConversationRow {
  id: string;
  status: ConversationStatus;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/**
 * AIバックエンド担当の唯一のServer Action。顧客の最新メッセージに対してFAQ検索・Claude呼び出しを
 * 行い、AI回答の保存または人間へのエスカレーションを行う。
 * ARCHITECTURE.md §7境界ルール: 顧客UIはこのActionを直接呼ばず、send-customer-message.tsの後段で
 * 呼び出す想定（Phase 5で統合）。ここではservice role（admin client）を使用する
 * （AIによるconversations更新・sender_type=aiのmessages挿入は顧客のRLS権限では行えないため）。
 * nowはD-013に倣い引数で受け取る（本番は既定値のnew Date()、テストは任意の時刻を注入する）。
 */
export async function respondWithAi(
  conversationId: string,
  now: Date = new Date(),
): Promise<RespondWithAiResult> {
  const supabase = createAdminClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("id", conversationId)
    .maybeSingle<ConversationRow>();

  if (conversationError || !conversation) {
    return { success: false };
  }

  // ai_handling以外（waiting_operator/operator_handling/closed）の会話には介入しない。
  // ただし既にエスカレーション済み（waiting_operator/operator_handling）の会話へ顧客が
  // さらにメッセージを送った場合は、AIやオペレーターからの反応が一切ないまま無音になって
  // しまうため、systemメッセージで受付済みであることだけ即時に伝える（2026-08-06、ユーザー
  // からの指摘を受けて追加）。closedの会話には表示しない。
  if (conversation.status !== "ai_handling") {
    if (
      conversation.status === "waiting_operator" ||
      conversation.status === "operator_handling"
    ) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "system",
        sender_id: null,
        content: "メッセージを受け付けました。担当者からの返信までしばらくお待ちください。",
      });
    }
    return { success: true, skipped: true };
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError || !messageRows) {
    return { success: false };
  }

  const history = (messageRows as MessageRow[]).map(toMessage);
  const latestCustomerMessage = [...history]
    .reverse()
    .find((message) => message.senderType === "customer");

  if (!latestCustomerMessage) {
    return { success: true, skipped: true };
  }

  const holidays = await getBusinessHolidays();
  const afterHours = isAfterHours(now, holidays);

  let validated: ValidatedAiResponse;

  try {
    const matchedFaqs = await searchFaqs(latestCustomerMessage.content);
    const rawJson = await callClaude(history, matchedFaqs, afterHours);
    validated = validateAiResponse(rawJson, matchedFaqs);
  } catch (error) {
    // FR-13: APIキーや顧客の秘密情報はログへ記録しない。エラー種別とメッセージのみ記録する。
    if (error instanceof Anthropic.APIError) {
      console.error(
        `[respond-with-ai] Claude API error: ${error.status} ${error.message}`,
      );
    } else if (error instanceof Error) {
      console.error(`[respond-with-ai] error: ${error.message}`);
    }

    validated = {
      escalate: true,
      answer:
        "申し訳ございません。現在AIによる自動応答が一時的にご利用いただけません。担当者が確認いたします。",
      category: null,
      escalationReason: "ai_api_error",
    };
  }

  const nowIso = now.toISOString();

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    sender_id: null,
    content: validated.answer,
  });

  if (insertError) {
    return { success: false };
  }

  const conversationUpdate: Record<string, unknown> = {
    status: validated.escalate ? "waiting_operator" : "ai_handling",
  };

  if (validated.category) {
    conversationUpdate.category = validated.category;
  }

  if (validated.escalate) {
    conversationUpdate.escalated_reason = validated.escalationReason;
    conversationUpdate.escalated_at = nowIso;
    conversationUpdate.is_after_hours = afterHours;
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update(conversationUpdate)
    .eq("id", conversationId);

  if (updateError) {
    return { success: false };
  }

  return { success: true, escalated: validated.escalate };
}
