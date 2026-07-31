"use server";

import { createClient } from "@/lib/supabase/server";
import {
  MessageValidationError,
  validateMessageContent,
} from "@/lib/validation/message";
import {
  assertWithinRateLimit,
  RateLimitExceededError,
} from "@/lib/validation/rate-limit";

export interface SendCustomerMessageResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

/**
 * 顧客チャットUI担当の唯一のServer Action。
 * 顧客自身のセッション（RLS適用）でconversations/messagesへ書き込む。
 * AI応答の生成（Claude API呼び出し）はここでは行わない
 * （ARCHITECTURE.md §7境界ルール: 顧客UIはClaude APIを直接呼ばない。AIバックエンド側の
 * 処理と統合するのはPhase 5）。
 */
export async function sendCustomerMessage(
  conversationId: string | null,
  content: string,
): Promise<SendCustomerMessageResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "セッションが見つかりません。ページを再読み込みしてください。",
    };
  }

  let validatedContent: string;
  try {
    validatedContent = validateMessageContent(content);
  } catch (error) {
    if (error instanceof MessageValidationError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  try {
    await assertWithinRateLimit(user.id, new Date());
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  let activeConversationId: string;

  if (conversationId) {
    activeConversationId = conversationId;
  } else {
    const { data: conversation, error: createError } = await supabase
      .from("conversations")
      .insert({ customer_user_id: user.id })
      .select("id")
      .single();

    if (createError || !conversation) {
      return {
        success: false,
        error: "会話を開始できませんでした。時間をおいて再度お試しください。",
      };
    }

    activeConversationId = conversation.id;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: activeConversationId,
    sender_type: "customer",
    sender_id: user.id,
    content: validatedContent,
  });

  if (messageError) {
    return {
      success: false,
      error:
        "メッセージを送信できませんでした。時間をおいて再度お試しください。",
    };
  }

  return { success: true, conversationId: activeConversationId };
}
