import { createAdminClient } from "@/lib/supabase/create-admin-client";

/**
 * business_holidaysには顧客・オペレーターいずれのRLSポリシーも存在しないため、
 * service role（admin client）でのみ取得できる。
 * create-admin-client.tsを直接使う理由はsrc/lib/supabase/admin.tsのコメントを参照
 * （server-onlyガードがVitest等プレーンなNode実行から直接テストする際に問題となるため）。
 */
export async function getBusinessHolidays(): Promise<Date[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("business_holidays")
    .select("holiday_date");

  if (error) {
    throw new Error(`Failed to fetch business_holidays: ${error.message}`);
  }

  return (data ?? []).map(
    (row) => new Date(`${row.holiday_date}T00:00:00+09:00`),
  );
}
