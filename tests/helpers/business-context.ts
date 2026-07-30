// test-conversations.jsonのbusiness_contextフィールド（D-013）を、
// isAfterHours(now, holidays) に渡す具体的なnowへ変換するテスト専用ユーティリティ。
// 実カレンダーの検証コストを避けるため、曜日が固定で分かっている代表日時のみを使う。
export type BusinessContext = "business_hours" | "after_hours";

// 2026-06-02 14:00 JSTは火曜日（平日営業時間内）
// 2026-06-06 20:00 JSTは土曜日（営業時間外）
const SAMPLE_TIMES: Record<BusinessContext, string> = {
  business_hours: "2026-06-02T14:00:00+09:00",
  after_hours: "2026-06-06T20:00:00+09:00",
};

export function resolveBusinessContextToNow(context: BusinessContext): Date {
  return new Date(SAMPLE_TIMES[context]);
}
