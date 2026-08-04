import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_COOKIE_OPTIONS } from "./cookie-options";

/**
 * Server Component / Server Action用Supabaseクライアント。
 * 呼び出し元ユーザーのセッションを引き継ぐため、RLSはそのユーザーの権限で評価される。
 * service role keyは使用しない。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Componentからの呼び出しではCookieを書き換えられない。
            // セッション更新はmiddleware.tsで行うため、ここでは無視してよい。
          }
        },
      },
    },
  );
}
