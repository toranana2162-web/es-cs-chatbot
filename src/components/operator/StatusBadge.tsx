import type { ConversationStatus } from "@/types/domain";

const STATUS_LABELS: Record<ConversationStatus, string> = {
  ai_handling: "AI対応中",
  waiting_operator: "対応待ち",
  operator_handling: "対応中",
  closed: "完了",
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
  ai_handling: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  waiting_operator: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  operator_handling: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
