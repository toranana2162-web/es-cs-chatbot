import type { SenderType } from "@/types/domain";

export function getSenderLabel(senderType: SenderType): string {
  switch (senderType) {
    case "customer":
      return "あなた";
    case "ai":
      return "AIサポート";
    case "operator":
      return "担当者";
    case "system":
      return "システム";
  }
}

export function isOwnMessage(senderType: SenderType): boolean {
  return senderType === "customer";
}
