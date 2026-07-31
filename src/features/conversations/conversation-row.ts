import "server-only";

import type {
  Conversation,
  ConversationCategory,
  ConversationStatus,
  EscalationReason,
} from "@/types/domain";

export interface OperatorConversation extends Conversation {
  assignedOperatorDisplayName: string | null;
}

interface OperatorProfileEmbed {
  display_name: string;
}

interface ConversationRowWithOperator {
  id: string;
  customer_user_id: string;
  status: string;
  category: string | null;
  assigned_operator_id: string | null;
  escalated_reason: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  is_after_hours: boolean;
  escalated_at: string | null;
  claimed_at: string | null;
  operator_profiles: OperatorProfileEmbed | OperatorProfileEmbed[] | null;
}

/**
 * `conversations`テーブルの行（+ operator_profiles(display_name)の埋め込み結果）を
 * 共通ドメイン型（src/types/domain.ts）へ変換する。一覧・詳細の両方から利用する。
 */
export function mapConversationRow(row: ConversationRowWithOperator): OperatorConversation {
  const operatorProfile = Array.isArray(row.operator_profiles)
    ? row.operator_profiles[0]
    : row.operator_profiles;

  return {
    id: row.id,
    customerUserId: row.customer_user_id,
    status: row.status as ConversationStatus,
    category: row.category as ConversationCategory | null,
    assignedOperatorId: row.assigned_operator_id,
    escalatedReason: row.escalated_reason as EscalationReason | null,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isAfterHours: row.is_after_hours,
    escalatedAt: row.escalated_at,
    claimedAt: row.claimed_at,
    assignedOperatorDisplayName: operatorProfile?.display_name ?? null,
  };
}
