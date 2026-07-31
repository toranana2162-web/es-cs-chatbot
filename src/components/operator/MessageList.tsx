import type { Message, SenderType } from "@/types/domain";

const SENDER_LABELS: Record<SenderType, string> = {
  customer: "顧客",
  ai: "AI",
  operator: "オペレーター",
  system: "システム",
};

const BUBBLE_ALIGNMENT: Record<SenderType, string> = {
  customer: "items-start",
  ai: "items-start",
  operator: "items-end",
  system: "items-center",
};

const BUBBLE_COLOR: Record<SenderType, string> = {
  customer: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
  ai: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  operator: "bg-blue-600 text-white",
  system: "bg-transparent text-zinc-400 italic",
};

export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">メッセージはまだありません。</p>;
  }

  return (
    <ol className="flex flex-1 flex-col gap-3 overflow-y-auto">
      {messages.map((message) => (
        <li key={message.id} className={`flex flex-col ${BUBBLE_ALIGNMENT[message.senderType]}`}>
          <span className="mb-1 text-xs text-zinc-400">
            {SENDER_LABELS[message.senderType]} ・{" "}
            {new Date(message.createdAt).toLocaleString("ja-JP")}
          </span>
          <p
            className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${BUBBLE_COLOR[message.senderType]}`}
          >
            {message.content}
          </p>
        </li>
      ))}
    </ol>
  );
}
