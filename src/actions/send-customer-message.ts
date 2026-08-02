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
import { respondWithAi } from "@/actions/respond-with-ai";

export interface SendCustomerMessageResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

/**
 * 顧客チャットUI担当の唯一のServer Action。
 * 顧客自身のセッション（RLS適用）でconversations/messagesへ書き込む。
 * Claude API自体はここでは呼ばない（ARCHITECTURE.md §7境界ルール: 顧客UIはClaude APIを
 * 直接呼ばない）。respondWithAi（AIバックエンド担当のServer Action）を後続で呼び出すことで
 * Phase 5として統合する。respondWithAiはservice role（admin client）で動作し、
 * ai_handling以外の会話には何もしないため、常に呼び出してよい。
 * AI応答が失敗しても顧客のメッセージ自体は既に保存済みのため、ここでは握りつぶして
 * successを返す（REQUIREMENTS.md 非機能要件: AI応答失敗時も顧客メッセージを失わない）。
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

  try {
    await respondWithAi(activeConversationId);
  } catch (error) {
    // 顧客メッセージは既に保存済みのため、AI応答側の失敗で顧客への応答を失敗にしない。
    // respondWithAi内部のClaude呼び出し失敗は既にwaiting_operator/ai_api_errorとして
    // 処理されるため、ここに到達するのはDB更新等の想定外エラーのみ。
    console.error(
      `[send-customer-message] respondWithAi failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return { success: true, conversationId: activeConversationId };
}
