import type { ConversationCategory } from "@/types/domain";

const CATEGORY_LABELS: Record<ConversationCategory, string> = {
  inventory: "在庫確認",
  product: "商品質問",
  shipping: "配送状況",
  return: "返品・交換",
  other: "その他",
};

export function CategoryBadge({ category }: { category: ConversationCategory }) {
  return (
    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
      {CATEGORY_LABELS[category]}
    </span>
  );
}
