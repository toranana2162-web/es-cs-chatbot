import { notFound } from "next/navigation";

import { ConversationDetail } from "@/components/operator/ConversationDetail";
import { getConversation } from "@/features/conversations/get-conversation";
import { listMessages } from "@/features/messages/list-messages";
import { requireOperator } from "@/lib/auth/require-operator";
import { createClient } from "@/lib/supabase/server";

export default async function OperatorConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOperator();
  const supabase = await createClient();

  const conversation = await getConversation(supabase, id);
  if (!conversation) {
    notFound();
  }

  const messages = await listMessages(supabase, id);

  return (
    <ConversationDetail
      conversation={conversation}
      messages={messages}
      currentOperatorId={session.userId}
    />
  );
}
