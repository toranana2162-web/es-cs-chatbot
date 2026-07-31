"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { claimConversation } from "@/actions/claim-conversation";

export function ClaimButton({ conversationId }: { conversationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await claimConversation(conversationId);
      if (!result.success) {
        setError(result.error);
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
        className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isPending ? "処理中..." : "対応を開始する"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
