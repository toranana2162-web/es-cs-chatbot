import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  ConversationCategory,
  ConversationStatus,
  EscalationReason,
  SenderType,
} from "@/types/domain";
import type { BusinessContext } from "../helpers/business-context";

export interface TestConversationMessage {
  sender: SenderType;
  message: string;
}

export interface TestConversationExpected {
  category: ConversationCategory | null;
  escalate: boolean;
  status: ConversationStatus;
  escalated_reason: EscalationReason | null;
  is_after_hours: boolean;
  notes: string;
}

export interface TestConversationScenario {
  id: string;
  type: "unit" | "integration" | "e2e";
  name: string;
  business_context: BusinessContext;
  input?: TestConversationMessage[];
  precondition?: {
    input: TestConversationMessage[];
    status_before: ConversationStatus;
    assigned_operator_id_before: string | null;
  };
  concurrent_actions?: Array<{ actor: string; action: string }>;
  expected: TestConversationExpected;
}

export function loadTestConversations(): TestConversationScenario[] {
  const filePath = path.resolve(__dirname, "../../test-conversations.json");
  return JSON.parse(readFileSync(filePath, "utf-8"));
}
