import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { OperatorProfile } from "@/types/domain";

export interface OperatorSession {
  userId: string;
  email: string | null;
  profile: OperatorProfile;
}

/**
 * オペレーター管理画面のページ・Server Actionで使う認証チェック。
 * authenticatedであるだけではオペレーター権限を与えない（SECURITY.md §3）ため、
 * operator_profilesにis_active=trueで登録済みであることまで確認する。
 */
export async function requireOperator(): Promise<OperatorSession> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/operator/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("operator_profiles")
    .select("user_id, display_name, role, is_active, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.is_active) {
    redirect("/operator/login?error=not_operator");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: {
      userId: profile.user_id,
      displayName: profile.display_name,
      role: profile.role as OperatorProfile["role"],
      isActive: profile.is_active,
      createdAt: profile.created_at,
    },
  };
}
