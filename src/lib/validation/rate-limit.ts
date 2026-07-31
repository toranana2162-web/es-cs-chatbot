import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// SECURITY.md §6: 顧客の連続送信は1分間に10回までを目安とする。超過時はHTTP 429相当を返す。
export const RATE_LIMIT_MAX_MESSAGES = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export class RateLimitExceededError extends Error {}

/**
 * 専用のレート制限ストア（Redis等）を新設せず、messagesテーブルへの直近送信件数をその都度数える。
 * 月間500件規模のMVPでは単一クエリのコストは無視できるため、この方式で十分とする。
 */
export async function assertWithinRateLimit(
  customerUserId: string,
  now: Date,
): Promise<void> {
  const supabase = createAdminClient();
  const windowStart = new Date(
    now.getTime() - RATE_LIMIT_WINDOW_MS,
  ).toISOString();

  const { count, error } = await supabase
    .from("messages")
    .select("id, conversations!inner(customer_user_id)", {
      count: "exact",
      head: true,
    })
    .eq("sender_type", "customer")
    .eq("conversations.customer_user_id", customerUserId)
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`Failed to check rate limit: ${error.message}`);
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX_MESSAGES) {
    throw new RateLimitExceededError(
      "送信回数の上限を超えました。しばらくしてから再度お試しください。",
    );
  }
}
