import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapConversationRow, type OperatorConversation } from "./conversation-row";

/**
 * 会話詳細を1件取得する。存在しない、またはRLS上アクセスできない場合はnullを返す。
 */
export async function getConversation(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<OperatorConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, operator_profiles(display_name)")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  return data ? mapConversationRow(data) : null;
}
