import { describe, expect, it } from "vitest";
import { getSenderLabel, isOwnMessage } from "@/components/widget/sender-label";

describe("getSenderLabel", () => {
  it.each([
    ["customer", "あなた"],
    ["ai", "AIサポート"],
    ["operator", "担当者"],
    ["system", "システム"],
  ] as const)("%s を %s に変換する", (senderType, expected) => {
    expect(getSenderLabel(senderType)).toBe(expected);
  });
});

describe("isOwnMessage", () => {
  it("customerのみtrueを返す", () => {
    expect(isOwnMessage("customer")).toBe(true);
    expect(isOwnMessage("ai")).toBe(false);
    expect(isOwnMessage("operator")).toBe(false);
    expect(isOwnMessage("system")).toBe(false);
  });
});
