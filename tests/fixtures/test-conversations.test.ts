import { describe, expect, it } from "vitest";
import { loadTestConversations } from "./load-test-conversations";

const VALID_SENDER_TYPES = ["customer", "ai", "operator", "system"];
const VALID_STATUSES = [
  "ai_handling",
  "waiting_operator",
  "operator_handling",
  "closed",
];
const VALID_CATEGORIES = ["inventory", "product", "shipping", "return", "other"];
const VALID_ESCALATION_REASONS = [
  "customer_request",
  "faq_not_found",
  "low_similarity",
  "order_specific",
  "refund_or_payment_issue",
  "complaint",
  "ai_uncertain",
  "ai_api_error",
];
const VALID_BUSINESS_CONTEXTS = ["business_hours", "after_hours"];

// test-conversations.jsonは手動編集される想定のため、TEST_PLAN.md/ARCHITECTURE.mdのenumと
// 矛盾する値が紛れ込んでいないかをここで機械的に検証する（このセッション内で実際に発生した
// "assistant"や"operator_a"のような不正値の再発を防ぐ）。
describe("test-conversations.json", () => {
  const scenarios = loadTestConversations();

  it("シナリオ1〜12がすべて揃っている", () => {
    expect(scenarios).toHaveLength(12);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))(
    "%s: sender/category/status/escalated_reason/business_contextが許容値内である",
    (_id, scenario) => {
      expect(VALID_BUSINESS_CONTEXTS).toContain(scenario.business_context);

      const messages = scenario.input ?? scenario.precondition?.input ?? [];
      for (const message of messages) {
        expect(VALID_SENDER_TYPES).toContain(message.sender);
      }

      if (scenario.expected.category !== null) {
        expect(VALID_CATEGORIES).toContain(scenario.expected.category);
      }
      expect(VALID_STATUSES).toContain(scenario.expected.status);
      if (scenario.expected.escalated_reason !== null) {
        expect(VALID_ESCALATION_REASONS).toContain(scenario.expected.escalated_reason);
      }

      // FR-06: エスカレーション時はescalated_reasonを保存する
      if (scenario.expected.escalate) {
        expect(scenario.expected.escalated_reason).not.toBeNull();
      }
    },
  );

  it("scenario-10は同時実行を表すconcurrent_actions構造を持つ", () => {
    const scenario10 = scenarios.find((s) => s.id === "scenario-10");
    expect(scenario10?.concurrent_actions).toHaveLength(2);
    expect(scenario10?.precondition).toBeDefined();
  });
});
