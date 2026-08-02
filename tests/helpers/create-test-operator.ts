import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS/オペレーターフローのライブ統合テスト用に、既知のパスワードを持つ使い捨て
 * オペレーターアカウントを作成する。npm run register:operatorはパスワードを保存しないため、
 * 実在のオペレーターアカウントではテストにログインできない。
 */
export async function createTestOperator(
  admin: SupabaseClient,
  role: "operator" | "admin" = "operator",
): Promise<{ userId: string; email: string; password: string }> {
  const email = `test-operator-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test operator: ${error?.message}`);
  }

  const { error: profileError } = await admin.from("operator_profiles").insert({
    user_id: data.user.id,
    display_name: `テストオペレーター ${email}`,
    role,
    is_active: true,
  });

  if (profileError) {
    throw new Error(
      `Failed to insert operator_profiles: ${profileError.message}`,
    );
  }

  return { userId: data.user.id, email, password };
}

export async function deleteTestOperator(
  admin: SupabaseClient,
  userId: string,
) {
  await admin.from("operator_profiles").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

export function createAnonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
