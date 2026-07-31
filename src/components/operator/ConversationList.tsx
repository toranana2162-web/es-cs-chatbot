import Link from "next/link";

import type { OperatorConversation } from "@/features/conversations/conversation-row";

import { CategoryBadge } from "./CategoryBadge";
import { StatusBadge } from "./StatusBadge";

export interface ConversationListItemData {
  conversation: OperatorConversation;
  latestMessagePreview: string | null;
  unread: boolean;
}

export function ConversationList({ items }: { items: ConversationListItemData[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">該当する会話はありません。</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
      {items.map(({ conversation, latestMessagePreview, unread }) => (
        <li key={conversation.id}>
          <Link
            href={`/operator/conversations/${conversation.id}`}
            className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              {unread && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="未読" />
              )}
              <StatusBadge status={conversation.status} />
              {conversation.category && <CategoryBadge category={conversation.category} />}
              {conversation.isAfterHours && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  営業時間外
                </span>
              )}
              <span className="ml-auto shrink-0 text-xs text-zinc-400">
                {new Date(conversation.lastMessageAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
              {latestMessagePreview ?? "メッセージなし"}
            </p>
            <p className="text-xs text-zinc-400">
              担当: {conversation.assignedOperatorDisplayName ?? "未割当"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
