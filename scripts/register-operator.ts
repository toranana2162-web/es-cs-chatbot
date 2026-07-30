import "dotenv/config";
import { createAdminClient } from "../src/lib/supabase/create-admin-client";

// D-010: オペレーター登録は管理者がSupabase Auth + operator_profilesへ手動で行う。
// 使い方: npm run register:operator -- <email> <displayName> <operator|admin>
async function main() {
  const [, , email, displayName, role] = process.argv;

  if (!email || !displayName || !role) {
    console.error(
      "Usage: npm run register:operator -- <email> <displayName> <operator|admin>",
    );
    process.exit(1);
  }
  if (role !== "operator" && role !== "admin") {
    console.error('role must be "operator" or "admin"');
    process.exit(1);
  }

  const supabase = createAdminClient();
  const temporaryPassword = crypto.randomUUID();

  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

  if (userError || !userData.user) {
    throw new Error(`Failed to create auth user: ${userError?.message}`);
  }

  const { error: profileError } = await supabase
    .from("operator_profiles")
    .insert({
      user_id: userData.user.id,
      display_name: displayName,
      role,
      is_active: true,
    });

  if (profileError) {
    throw new Error(
      `Failed to insert operator_profiles: ${profileError.message}`,
    );
  }

  console.log(`Registered operator: ${email} (${displayName}, ${role})`);
  console.log(`Temporary password: ${temporaryPassword}`);
  console.log(
    "実運用ではSupabaseダッシュボードからパスワードリセットメールを送るか、初回ログイン後にパスワードを変更してください。",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
