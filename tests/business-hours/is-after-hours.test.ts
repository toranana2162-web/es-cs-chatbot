import { describe, expect, it } from "vitest";
import { isAfterHours } from "@/lib/business-hours/is-after-hours";
import { resolveBusinessContextToNow } from "../helpers/business-context";

// 2026-06-02は火曜日、2026-06-06は土曜日（tests/helpers/business-context.tsで検証済み）
describe("isAfterHours", () => {
  it("平日日中は営業時間内（false）", () => {
    expect(isAfterHours(new Date("2026-06-02T14:00:00+09:00"), [])).toBe(false);
  });

  it("平日10:00ちょうどは営業時間内（開始境界は含む）", () => {
    expect(isAfterHours(new Date("2026-06-02T10:00:00+09:00"), [])).toBe(false);
  });

  it("平日9:59は営業時間外（開店前）", () => {
    expect(isAfterHours(new Date("2026-06-02T09:59:00+09:00"), [])).toBe(true);
  });

  it("平日17:59は営業時間内（閉店直前）", () => {
    expect(isAfterHours(new Date("2026-06-02T17:59:00+09:00"), [])).toBe(false);
  });

  it("平日18:00ちょうどは営業時間外（終了境界は含まない）", () => {
    expect(isAfterHours(new Date("2026-06-02T18:00:00+09:00"), [])).toBe(true);
  });

  it("土曜日は終日営業時間外", () => {
    expect(isAfterHours(new Date("2026-06-06T12:00:00+09:00"), [])).toBe(true);
  });

  it("日曜日は終日営業時間外", () => {
    expect(isAfterHours(new Date("2026-06-07T12:00:00+09:00"), [])).toBe(true);
  });

  it("business_holidaysに登録された平日は営業時間外", () => {
    const holiday = new Date("2026-06-03T00:00:00+09:00");
    expect(isAfterHours(new Date("2026-06-03T14:00:00+09:00"), [holiday])).toBe(true);
  });

  it("business_holidaysに登録されていない平日は通常どおり判定する", () => {
    const holiday = new Date("2026-06-03T00:00:00+09:00");
    expect(isAfterHours(new Date("2026-06-02T14:00:00+09:00"), [holiday])).toBe(false);
  });

  it("business_contextのbusiness_hoursサンプルは営業時間内", () => {
    expect(isAfterHours(resolveBusinessContextToNow("business_hours"), [])).toBe(false);
  });

  it("business_contextのafter_hoursサンプルは営業時間外", () => {
    expect(isAfterHours(resolveBusinessContextToNow("after_hours"), [])).toBe(true);
  });
});
