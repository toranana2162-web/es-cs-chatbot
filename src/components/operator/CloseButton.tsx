"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { closeConversation } from "@/actions/close-conversation";

export function CloseButton({ conversationId }: { conversationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    if (!window.confirm("この会話を完了にしますか？")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await closeConversation(conversationId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {isPending ? "処理中..." : "この会話を完了にする"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
