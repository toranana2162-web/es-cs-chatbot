"use server";

import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth/require-operator";
import { createClient } from "@/lib/supabase/server";

export type CloseConversationResult = { success: true } | { success: false; error: string };

/**
 * 会話の完了（FR-07/ARCHITECTURE.md §3）。
 * 二重対応を避けるため、担当オペレーター本人のみが完了操作を行える。
 */
export async function closeConversation(conversationId: string): Promise<CloseConversationResult> {
  const { userId } = await requireOperator();
  const supabase = await createClient();

  const { data: conversation, error: fetchError } = await supabase
    .from("conversations")
    .select("id, status, assigned_operator_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (fetchError || !conversation) {
    return { success: false, error: "会話が見つかりません" };
  }

  if (conversation.status === "closed") {
    return { success: true };
  }

  if (conversation.assigned_operator_id !== userId) {
    return { success: false, error: "この会話は他のオペレーターが担当しています" };
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ status: "closed" })
    .eq("id", conversationId);

  if (updateError) {
    return { success: false, error: "会話の完了に失敗しました" };
  }

  revalidatePath(`/operator/conversations/${conversationId}`);
  revalidatePath("/operator");

  return { success: true };
}
