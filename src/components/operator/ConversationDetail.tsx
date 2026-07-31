import type { Message } from "@/types/domain";
import type { OperatorConversation } from "@/features/conversations/conversation-row";

import { CategoryBadge } from "./CategoryBadge";
import { ClaimButton } from "./ClaimButton";
import { CloseButton } from "./CloseButton";
import { MessageList } from "./MessageList";
import { ReplyForm } from "./ReplyForm";
import { StatusBadge } from "./StatusBadge";

// FR-06 / D-012: escalated_reasonの固定コード値を管理画面向けの日本語ラベルへ変換する
const ESCALATION_REASON_LABELS: Record<string, string> = {
  customer_request: "顧客からの希望",
  faq_not_found: "関連FAQなし",
  low_similarity: "FAQ類似度不足",
  order_specific: "個別注文確認が必要",
  refund_or_payment_issue: "返金・決済関連",
  complaint: "クレーム",
  ai_uncertain: "AI判断不能",
  ai_api_error: "AI API障害",
};

interface Props {
  conversation: OperatorConversation;
  messages: Message[];
  currentOperatorId: string;
}

export function ConversationDetail({ conversation, messages, currentOperatorId }: Props) {
  const isMine = conversation.assignedOperatorId === currentOperatorId;
  const isUnassigned = conversation.assignedOperatorId === null;
  const isClosed = conversation.status === "closed";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={conversation.status} />
        {conversation.category && <CategoryBadge category={conversation.category} />}
        {conversation.isAfterHours && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            営業時間外
          </span>
        )}
        {conversation.escalatedReason && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            {ESCALATION_REASON_LABELS[conversation.escalatedReason] ?? conversation.escalatedReason}
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        担当: {conversation.assignedOperatorDisplayName ?? "未割当"}
      </p>

      <MessageList messages={messages} />

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {!isClosed && isUnassigned && <ClaimButton conversationId={conversation.id} />}

        {!isClosed && !isUnassigned && !isMine && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {conversation.assignedOperatorDisplayName ?? "他のオペレーター"}が対応中です。
          </p>
        )}

        {!isClosed && isMine && (
          <>
            <ReplyForm conversationId={conversation.id} />
            <CloseButton conversationId={conversation.id} />
          </>
        )}

        {isClosed && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">この会話は完了しています。</p>
        )}
      </div>
    </div>
  );
}
