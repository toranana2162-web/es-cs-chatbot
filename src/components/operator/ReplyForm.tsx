"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { sendOperatorMessage } from "@/actions/send-operator-message";

// SECURITY.md §6: サーバー側と同じ上限をクライアント側でも検証する
const MAX_MESSAGE_LENGTH = 1000;

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isTooLong = content.length > MAX_MESSAGE_LENGTH;
  const isEmpty = content.trim().length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty || isTooLong || isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await sendOperatorMessage(conversationId, content);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setContent("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        aria-label="返信を入力"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder="返信を入力"
        className="w-full resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${isTooLong ? "text-rose-600" : "text-zinc-400"}`}
        >
          {content.length} / {MAX_MESSAGE_LENGTH}
        </span>
        <button
          type="submit"
          disabled={isPending || isEmpty || isTooLong}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "送信中..." : "送信"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </form>
  );
}
