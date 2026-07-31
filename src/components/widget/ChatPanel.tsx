"use client";

import type { useConversation } from "./hooks/use-conversation";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { StatusBanner } from "./StatusBanner";

export function ChatPanel({
  onClose,
  conversation,
}: {
  onClose: () => void;
  conversation: ReturnType<typeof useConversation>;
}) {
  const {
    loadState,
    conversationStatus,
    messages,
    isSending,
    errorMessage,
    sendMessage,
  } = conversation;

  const isClosed = conversationStatus === "closed";

  async function handleSend(content: string) {
    await sendMessage(content);
  }

  return (
    <div className="flex h-[70vh] w-[min(360px,90vw)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:h-[32rem]">
      <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
        <span className="text-sm font-semibold">BOTANICA サポート</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="チャットを閉じる"
          className="text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>

      <StatusBanner status={conversationStatus} />

      {loadState === "error" ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-red-600">
          {errorMessage ??
            "エラーが発生しました。時間をおいて再度お試しください。"}
        </div>
      ) : (
        <MessageList messages={messages} isLoading={loadState === "loading"} />
      )}

      {errorMessage && loadState !== "error" ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <MessageInput
        disabled={loadState === "error" || isClosed}
        isSending={isSending}
        onSend={handleSend}
      />
    </div>
  );
}
