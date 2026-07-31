import type { ConversationStatus } from "@/types/domain";
import { getStatusLabel } from "./status-label";

export function StatusBanner({
  status,
}: {
  status: ConversationStatus | null;
}) {
  if (!status) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-1.5 text-xs text-gray-600">
      {getStatusLabel(status)}
    </div>
  );
}
