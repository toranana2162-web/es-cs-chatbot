const BUSINESS_START_HOUR = 10;
const BUSINESS_END_HOUR = 18;
const TIME_ZONE = "Asia/Tokyo";

function getJstParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/**
 * 営業時間外判定（D-013）。
 * 現在時刻を関数内部で取得せず、呼び出し側から引数として受け取る純粋関数にすることで、
 * 実時刻に依存しないテストを可能にする。本番コードでは isAfterHours(new Date(), holidays) のように呼ぶ。
 *
 * 営業時間: 平日10:00〜18:00（日本時間、[10:00, 18:00)の半開区間。18:00ちょうどは営業時間外）。
 * 土曜・日曜、およびholidaysに含まれる日付（祝日・特別休業日）は終日営業時間外とする。
 */
export function isAfterHours(now: Date, holidays: Date[]): boolean {
  const { dateKey, weekday, hour, minute } = getJstParts(now);

  if (weekday === "Sat" || weekday === "Sun") {
    return true;
  }

  const holidayKeys = new Set(holidays.map((holiday) => getJstParts(holiday).dateKey));
  if (holidayKeys.has(dateKey)) {
    return true;
  }

  const minutesSinceMidnight = hour * 60 + minute;
  const startMinutes = BUSINESS_START_HOUR * 60;
  const endMinutes = BUSINESS_END_HOUR * 60;

  return minutesSinceMidnight < startMinutes || minutesSinceMidnight >= endMinutes;
}
