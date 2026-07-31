"use server";

import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth/require-operator";
import { createClient } from "@/lib/supabase/server";

export type ClaimConversationResult = { success: true } | { success: false; error: string };

/**
 * オペレーターの担当開始（FR-14, D-008）。
 * public.claim_conversation()はassigned_operator_idがNULLの場合のみ成功する原子的なUPDATEのため、
 * 同時押しが発生しても先着1名だけが担当者になる。
 */
export async function claimConversation(conversationId: string): Promise<ClaimConversationResult> {
  const { userId } = await requireOperator();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("claim_conversation", {
    p_conversation_id: conversationId,
    p_operator_id: userId,
  });

  if (error) {
    return { success: false, error: "担当開始に失敗しました" };
  }

  if (!data || !data.id) {
    return { success: false, error: "既に他のオペレーターが対応を開始しています" };
  }

  revalidatePath(`/operator/conversations/${conversationId}`);
  revalidatePath("/operator");

  return { success: true };
}
