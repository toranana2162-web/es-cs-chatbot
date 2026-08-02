import { describe, expect, it } from "vitest";
import { validateAiResponse } from "@/features/ai/validate-response";
import type { MatchedFaq } from "@/features/faq/search-faqs";

const SAMPLE_FAQ: MatchedFaq = {
  id: "faq-1",
  category: "shipping",
  question: "送料はいくらですか？",
  answer: "全国一律550円です。",
  similarity: 0.9,
};

describe("validateAiResponse", () => {
  it("answeredかつFAQ根拠がある場合はescalate=falseとする", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "answered",
        answer: "送料は550円です。",
        category: "shipping",
        escalationReason: null,
      }),
      [SAMPLE_FAQ],
    );
    expect(result).toEqual({
      escalate: false,
      answer: "送料は550円です。",
      category: "shipping",
      escalationReason: null,
    });
  });

  it("FR-05: answeredなのにFAQ根拠が0件の場合は強制的にエスカレーションへ上書きする", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "answered",
        answer: "たぶんこうだと思います。",
        category: "other",
        escalationReason: null,
      }),
      [],
    );
    expect(result.escalate).toBe(true);
    expect(result.escalationReason).toBe("ai_uncertain");
  });

  it("escalatedの場合はescalationReasonを保持する", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "escalated",
        answer: "担当者が確認いたします。",
        category: "return",
        escalationReason: "order_specific",
      }),
      [SAMPLE_FAQ],
    );
    expect(result.escalate).toBe(true);
    expect(result.escalationReason).toBe("order_specific");
  });

  it("escalatedなのにescalationReasonが不正な場合はai_uncertainにフォールバックする", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "escalated",
        answer: "担当者が確認いたします。",
        category: null,
        escalationReason: "not_a_real_reason",
      }),
      [],
    );
    expect(result.escalationReason).toBe("ai_uncertain");
  });

  it("out_of_scopeの場合はescalate=false・escalationReason=nullとする", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "out_of_scope",
        answer: "申し訳ございませんが、そちらはサポート対象外です。",
        category: "other",
        escalationReason: "customer_request",
      }),
      [],
    );
    expect(result.escalate).toBe(false);
    expect(result.escalationReason).toBeNull();
  });

  it("不正なcategoryはnullへ丸める", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "out_of_scope",
        answer: "サポート対象外です。",
        category: "not_a_category",
        escalationReason: null,
      }),
      [],
    );
    expect(result.category).toBeNull();
  });

  it("answerが空文字の場合はフォールバック文言を使う", () => {
    const result = validateAiResponse(
      JSON.stringify({
        outcome: "escalated",
        answer: "   ",
        category: null,
        escalationReason: "ai_uncertain",
      }),
      [],
    );
    expect(result.answer).toBe("申し訳ございません。担当者が確認いたします。");
  });

  it("不正なJSONの場合は例外を投げる", () => {
    expect(() => validateAiResponse("not json", [])).toThrow();
  });
});
