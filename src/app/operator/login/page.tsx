import { redirect } from "next/navigation";

import { LoginForm } from "@/components/operator/LoginForm";
import { createClient } from "@/lib/supabase/server";

export default async function OperatorLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("operator_profiles")
      .select("user_id, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.is_active) {
      redirect("/operator");
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          オペレーターログイン
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
