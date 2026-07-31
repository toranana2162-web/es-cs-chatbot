"use server";

import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth/require-operator";
import { createClient } from "@/lib/supabase/server";
import { MessageValidationError, validateMessageContent } from "@/lib/validation/message";

export type SendOperatorMessageResult = { success: true } | { success: false; error: string };

/**
 * オペレーターから顧客への返信を送信する（FR-08）。
 * 担当中（operator_handling）かつ自分が担当者である会話にのみ返信できる。
 */
export async function sendOperatorMessage(
  conversationId: string,
  content: string,
): Promise<SendOperatorMessageResult> {
  const { userId } = await requireOperator();

  let validatedContent: string;
  try {
    validatedContent = validateMessageContent(content).trim();
  } catch (error) {
    if (error instanceof MessageValidationError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  const supabase = await createClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, status, assigned_operator_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation) {
    return { success: false, error: "会話が見つかりません" };
  }

  if (conversation.status === "closed") {
    return { success: false, error: "終了した会話には返信できません" };
  }

  if (conversation.status !== "operator_handling" || conversation.assigned_operator_id !== userId) {
    return { success: false, error: "先に対応を開始してください" };
  }

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "operator",
    sender_id: userId,
    content: validatedContent,
  });

  if (insertError) {
    return { success: false, error: "メッセージの送信に失敗しました" };
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/operator/conversations/${conversationId}`);
  revalidatePath("/operator");

  return { success: true };
}
