import { describe, expect, it } from "vitest";
import { getStatusLabel } from "@/components/widget/status-label";

describe("getStatusLabel", () => {
  it("ai_handlingを「AI対応中」に変換する", () => {
    expect(getStatusLabel("ai_handling")).toBe("AI対応中");
  });

  it("waiting_operatorを「担当者への確認待ち」に変換する", () => {
    expect(getStatusLabel("waiting_operator")).toBe("担当者への確認待ち");
  });

  it("operator_handlingを「担当者対応中」に変換する", () => {
    expect(getStatusLabel("operator_handling")).toBe("担当者対応中");
  });

  it("closedを「対応完了」に変換する", () => {
    expect(getStatusLabel("closed")).toBe("対応完了");
  });

  it("nullは空文字を返す", () => {
    expect(getStatusLabel(null)).toBe("");
  });
});
