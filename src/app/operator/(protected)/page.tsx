import { Suspense } from "react";

import { ConversationList } from "@/components/operator/ConversationList";
import { StatusFilter } from "@/components/operator/StatusFilter";
import { getLatestMessagesByConversation } from "@/features/messages/get-latest-messages";
import { listConversationsForOperator } from "@/features/conversations/list-conversations";
import { createClient } from "@/lib/supabase/server";
import type { ConversationStatus } from "@/types/domain";

const FILTERABLE_STATUSES: ConversationStatus[] = [
  "waiting_operator",
  "operator_handling",
  "ai_handling",
  "closed",
];

function parseStatus(value: string | undefined): ConversationStatus | undefined {
  return FILTERABLE_STATUSES.includes(value as ConversationStatus)
    ? (value as ConversationStatus)
    : undefined;
}

export default async function OperatorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const selectedStatus = parseStatus(status);

  const supabase = await createClient();
  const conversations = await listConversationsForOperator(supabase, selectedStatus);
  const latestMessages = await getLatestMessagesByConversation(
    supabase,
    conversations.map((conversation) => conversation.id),
  );

  const items = conversations.map((conversation) => {
    const latest = latestMessages.get(conversation.id);
    return {
      conversation,
      latestMessagePreview: latest?.content ?? null,
      // DBに既読状態を持たないため、「最新メッセージがオペレーター発信でない」ことを未読の代わりに表示する
      unread:
        conversation.status !== "closed" && latest !== undefined && latest.senderType !== "operator",
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">会話一覧</h1>
        <Suspense>
          <StatusFilter selected={selectedStatus} />
        </Suspense>
      </div>
      <ConversationList items={items} />
    </div>
  );
}
