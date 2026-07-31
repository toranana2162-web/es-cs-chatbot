"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface OperatorSignInState {
  error?: string;
}

/**
 * オペレーターログイン。Supabase Authでの認証成功後、operator_profilesに
 * is_active=trueで登録済みかを確認する（SECURITY.md §3: authenticatedだけでは権限を与えない）。
 */
export async function operatorSignIn(
  _prevState: OperatorSignInState | undefined,
  formData: FormData,
): Promise<OperatorSignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const { data: profile } = await supabase
    .from("operator_profiles")
    .select("user_id, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "オペレーター権限がありません" };
  }

  redirect("/operator");
}
