import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OperatorProfile } from "@/types/domain";

/**
 * 現在のセッションがオペレーター（operator_profilesに登録済み・有効）であるかを判定する。
 * RLSの「operator can view own profile」ポリシーにより、自分の行は常に閲覧できるため、
 * service roleを使わずServer用クライアント（server.ts）だけで判定できる。
 * 顧客（operator_profilesに行がない）の場合はnullを返す。
 */
export async function getCurrentOperator(): Promise<OperatorProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("operator_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    displayName: data.display_name,
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}
