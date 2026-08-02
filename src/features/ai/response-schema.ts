import type { ConversationCategory, EscalationReason } from "@/types/domain";

/**
 * Claudeの構造化出力の形。3つのoutcomeで、FR-05/FR-06/FR-15の分岐を明確に区別する。
 * - "answered": FAQに基づいて回答できた（matchedFaqsが空の場合はサーバー側で強制的にescalatedへ上書きする）
 * - "escalated": 人間対応が必要（FR-06の8条件のいずれか。ai_api_errorはAPI障害時にコード側でのみ使用し、Claude自身は選ばない）
 * - "out_of_scope": ECサイトと無関係な質問（FR-15）。原則エスカレーションしない
 */
export interface AiStructuredResponse {
  outcome: "answered" | "escalated" | "out_of_scope";
  answer: string;
  category: ConversationCategory | null;
  escalationReason: EscalationReason | null;
}

const CATEGORY_VALUES: ConversationCategory[] = [
  "inventory",
  "product",
  "shipping",
  "return",
  "other",
];

// ai_api_errorはAPI障害時にコード側でのみ設定するため、Claudeが選べる選択肢には含めない
const CLAUDE_ESCALATION_REASONS: EscalationReason[] = [
  "customer_request",
  "faq_not_found",
  "low_similarity",
  "order_specific",
  "refund_or_payment_issue",
  "complaint",
  "ai_uncertain",
];

export const AI_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    outcome: {
      type: "string",
      enum: ["answered", "escalated", "out_of_scope"],
    },
    answer: {
      type: "string",
    },
    category: {
      anyOf: [{ type: "string", enum: CATEGORY_VALUES }, { type: "null" }],
    },
    escalationReason: {
      anyOf: [
        { type: "string", enum: CLAUDE_ESCALATION_REASONS },
        { type: "null" },
      ],
    },
  },
  required: ["outcome", "answer", "category", "escalationReason"],
  additionalProperties: false,
} as const;
