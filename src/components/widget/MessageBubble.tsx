import type { Message } from "@/types/domain";
import { getSenderLabel, isOwnMessage } from "./sender-label";

export function MessageBubble({ message }: { message: Message }) {
  const own = isOwnMessage(message.senderType);

  return (
    <div className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
      <span className="mb-1 px-1 text-xs text-gray-500">
        {getSenderLabel(message.senderType)}
      </span>
      <div
        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
          own ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
