"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ConversationStatus } from "@/types/domain";

const FILTERS: { value: ConversationStatus | "active"; label: string }[] = [
  { value: "active", label: "すべて" },
  { value: "waiting_operator", label: "対応待ち" },
  { value: "operator_handling", label: "対応中" },
  { value: "ai_handling", label: "AI対応中" },
  { value: "closed", label: "完了" },
];

export function StatusFilter({ selected }: { selected: ConversationStatus | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = selected ?? "active";

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "active") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => handleSelect(filter.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            current === filter.value
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
