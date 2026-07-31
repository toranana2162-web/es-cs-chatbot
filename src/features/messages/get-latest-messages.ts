import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SenderType } from "@/types/domain";

export interface LatestMessage {
  conversationId: string;
  senderType: SenderType;
  content: string;
  createdAt: string;
}

/**
 * 複数会話それぞれの最新メッセージ1件を取得する。会話一覧のプレビュー文言と
 * 未読表示（DBに既読状態を持たないため、最新メッセージの送信者から導出する）に使う。
 */
export async function getLatestMessagesByConversation(
  supabase: SupabaseClient,
  conversationIds: string[],
): Promise<Map<string, LatestMessage>> {
  if (conversationIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id, sender_type, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch latest messages: ${error.message}`);
  }

  const latestByConversation = new Map<string, LatestMessage>();

  for (const row of data ?? []) {
    if (!latestByConversation.has(row.conversation_id)) {
      latestByConversation.set(row.conversation_id, {
        conversationId: row.conversation_id,
        senderType: row.sender_type as SenderType,
        content: row.content,
        createdAt: row.created_at,
      });
    }
  }

  return latestByConversation;
}
