import type { ReactNode } from "react";

import { OperatorHeader } from "@/components/operator/OperatorHeader";
import { RealtimeRefresher } from "@/components/operator/RealtimeRefresher";
import { requireOperator } from "@/lib/auth/require-operator";

export default async function OperatorProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireOperator();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <RealtimeRefresher />
      <OperatorHeader displayName={session.profile.displayName} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
