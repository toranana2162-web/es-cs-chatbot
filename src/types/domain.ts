// ARCHITECTURE.md §5 共通型。DBスキーマ・RLS同様、mainブランチで確定し独断で変更しない。

export type ConversationStatus =
  | "ai_handling"
  | "waiting_operator"
  | "operator_handling"
  | "closed";

export type SenderType = "customer" | "ai" | "operator" | "system";

export type ConversationCategory =
  | "inventory"
  | "product"
  | "shipping"
  | "return"
  | "other";

// D-012: escalated_reasonは自由入力ではなく固定コード値のみを許可する
export type EscalationReason =
  | "customer_request"
  | "faq_not_found"
  | "low_similarity"
  | "order_specific"
  | "refund_or_payment_issue"
  | "complaint"
  | "ai_uncertain"
  | "ai_api_error";

export interface Conversation {
  id: string;
  customerUserId: string;
  status: ConversationStatus;
  category: ConversationCategory | null;
  assignedOperatorId: string | null;
  escalatedReason: EscalationReason | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  isAfterHours: boolean;
  escalatedAt: string | null;
  claimedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Faq {
  id: string;
  category: ConversationCategory;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorProfile {
  userId: string;
  displayName: string;
  role: "operator" | "admin";
  isActive: boolean;
  createdAt: string;
}

export interface BusinessHoliday {
  id: string;
  holidayDate: string;
  holidayName: string;
  createdAt: string;
}
