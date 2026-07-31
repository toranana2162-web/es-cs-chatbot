import { operatorSignOut } from "@/actions/operator-sign-out";

export function OperatorHeader({ displayName }: { displayName: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="font-semibold text-zinc-900 dark:text-zinc-50">CSチャット管理画面</span>
      <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{displayName}</span>
        <form action={operatorSignOut}>
          <button
            type="submit"
            className="text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
