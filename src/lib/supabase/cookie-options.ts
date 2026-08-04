import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * ECサイトへiframeで埋め込まれた場合でもSupabase Authのセッションcookieを保持できるようにする設定。
 * 通常のcookie（SameSite=Lax等）はクロスサイトiframe内では保存・送信をブロックされることがある
 * （Chromeのサードパーティcookie制限）。SameSite=None + Secure + Partitioned（CHIPS）を使うことで、
 * クロスサイトiframeでもオリジンごとに分離されたcookieとして保存できるようにする。
 * トップレベルで直接アクセスした場合もPartitionedはそのサイト自身のパーティションとして扱われるため、
 * オペレーター画面・ウィジェットプレビューなど非埋め込みの動作には影響しない。
 */
export const SUPABASE_COOKIE_OPTIONS: CookieOptionsWithName = {
  sameSite: "none",
  secure: true,
  partitioned: true,
};
