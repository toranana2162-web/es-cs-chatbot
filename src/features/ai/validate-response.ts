import type { ConversationCategory, EscalationReason } from "@/types/domain";
import type { AiStructuredResponse } from "./response-schema";
import type { MatchedFaq } from "@/features/faq/search-faqs";

const CATEGORY_VALUES: ConversationCategory[] = [
  "inventory",
  "product",
  "shipping",
  "return",
  "other",
];

const ESCALATION_REASON_VALUES: EscalationReason[] = [
  "customer_request",
  "faq_not_found",
  "low_similarity",
  "order_specific",
  "refund_or_payment_issue",
  "complaint",
  "ai_uncertain",
  "ai_api_error",
];

export interface ValidatedAiResponse {
  escalate: boolean;
  answer: string;
  category: ConversationCategory | null;
  escalationReason: EscalationReason | null;
}

/**
 * Claudeの構造化出力をパースし、ドメインenumとの整合性・FR-05のハルシネーション抑制を
 * サーバー側で強制する（Claudeレスポンスのサーバー側検証、TASKS.md Phase3）。
 * 出力形式はoutput_config.formatで既に制約されているが、二重の防御として検証する。
 */
export function validateAiResponse(
  rawJson: string,
  matchedFaqs: MatchedFaq[],
): ValidatedAiResponse {
  let parsed: AiStructuredResponse;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Claude response was not valid JSON");
  }

  const answer =
    typeof parsed.answer === "string" && parsed.answer.trim().length > 0
      ? parsed.answer
      : "申し訳ございません。担当者が確認いたします。";

  const category = CATEGORY_VALUES.includes(
    parsed.category as ConversationCategory,
  )
    ? (parsed.category as ConversationCategory)
    : null;

  let outcome = parsed.outcome;

  // FR-05 回答抑制: FAQ根拠が1件もないのに"answered"を選んだ場合は、
  // ハルシネーション防止のため強制的にエスカレーションへ上書きする。
  if (outcome === "answered" && matchedFaqs.length === 0) {
    outcome = "escalated";
  }

  if (outcome === "escalated") {
    const escalationReason = ESCALATION_REASON_VALUES.includes(
      parsed.escalationReason as EscalationReason,
    )
      ? (parsed.escalationReason as EscalationReason)
      : "ai_uncertain";

    return { escalate: true, answer, category, escalationReason };
  }

  return { escalate: false, answer, category, escalationReason: null };
}
