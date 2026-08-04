import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_COOKIE_OPTIONS } from "./cookie-options";

/**
 * ブラウザ（クライアントコンポーネント）用Supabaseクライアント。
 * anon keyのみを使用し、アクセス制御はRLSに委ねる（SECURITY.md §4）。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: SUPABASE_COOKIE_OPTIONS },
  );
}
