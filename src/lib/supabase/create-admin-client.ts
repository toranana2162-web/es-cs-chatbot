import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * service role keyを使用する管理用Supabaseクライアントの実体。
 * アプリコードからは必ず ./admin.ts（server-onlyガード付き）経由でimportすること。
 * scripts/配下の単発スクリプト（Next.jsのバンドル対象外）はこのファイルを直接importしてよい。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
