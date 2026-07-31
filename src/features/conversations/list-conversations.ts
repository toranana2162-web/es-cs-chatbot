import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConversationStatus } from "@/types/domain";

import { mapConversationRow, type OperatorConversation } from "./conversation-row";

/**
 * オペレーター管理画面の会話一覧を取得する。
 * statusを指定した場合はその状態のみ、未指定の場合はclosedを除く全件を返す（状態フィルタのデフォルト表示）。
 * 呼び出し側のセッションに紐づくSupabaseクライアントを受け取り、RLS
 * （operators can view all conversations）でアクセス可否を制御する。
 */
export async function listConversationsForOperator(
  supabase: SupabaseClient,
  status?: ConversationStatus,
): Promise<OperatorConversation[]> {
  let query = supabase
    .from("conversations")
    .select("*, operator_profiles(display_name)")
    .order("last_message_at", { ascending: false });

  query = status ? query.eq("status", status) : query.neq("status", "closed");

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  return (data ?? []).map(mapConversationRow);
}
