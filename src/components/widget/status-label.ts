import type { ConversationStatus } from "@/types/domain";

export function getStatusLabel(status: ConversationStatus | null): string {
  switch (status) {
    case "ai_handling":
      return "AI対応中";
    case "waiting_operator":
      return "担当者への確認待ち";
    case "operator_handling":
      return "担当者対応中";
    case "closed":
      return "対応完了";
    case null:
      return "";
  }
}
