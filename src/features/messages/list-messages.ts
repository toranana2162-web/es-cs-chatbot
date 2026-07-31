import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Message, SenderType } from "@/types/domain";

/**
 * 会話に紐づく全メッセージを送信順（古い→新しい）で取得する。
 */
export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type as SenderType,
    senderId: row.sender_id,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}
