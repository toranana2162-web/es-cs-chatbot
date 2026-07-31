"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, ConversationStatus, Message } from "@/types/domain";
import { sendCustomerMessage } from "@/actions/send-customer-message";

interface ConversationRow {
  id: string;
  customer_user_id: string;
  status: ConversationStatus;
  category: Conversation["category"];
  assigned_operator_id: string | null;
  escalated_reason: Conversation["escalatedReason"];
  last_message_at: string;
  created_at: string;
  updated_at: string;
  is_after_hours: boolean;
  escalated_at: string | null;
  claimed_at: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: Message["senderType"];
  sender_id: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export type ConversationLoadState = "idle" | "loading" | "ready" | "error";

export function useConversation(enabled: boolean) {
  const [loadState, setLoadState] = useState<ConversationLoadState>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startedRef = useRef(false);
  const supabaseRef = useRef(createClient());

  const subscribeToConversation = useCallback(
    (targetConversationId: string) => {
      const supabase = supabaseRef.current;

      const channel = supabase
        .channel(`conversation:${targetConversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${targetConversationId}`,
          },
          (payload) => {
            const row = payload.new as MessageRow;
            setMessages((current) => {
              if (current.some((message) => message.id === row.id)) {
                return current;
              }
              return [...current, toMessage(row)];
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
            filter: `id=eq.${targetConversationId}`,
          },
          (payload) => {
            const row = payload.new as ConversationRow;
            setConversationStatus(row.status);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [],
  );

  /**
   * 指定した会話のメッセージを取得してからRealtime購読を開始する。
   * 「先にfetch、後でsubscribe」の順序を守ることで、fetchとsubscribeの間に
   * 挿入されたメッセージも取りこぼさない（subscribeは将来のイベントしか拾わないため）。
   */
  const loadMessagesAndSubscribe = useCallback(
    async (targetConversationId: string) => {
      const supabase = supabaseRef.current;

      const { data: existingMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", targetConversationId)
        .order("created_at", { ascending: true });

      setMessages((current) => {
        const fetched = ((existingMessages as MessageRow[] | null) ?? []).map(
          toMessage,
        );
        const merged = [...fetched];
        for (const message of current) {
          if (!merged.some((m) => m.id === message.id)) {
            merged.push(message);
          }
        }
        return merged;
      });

      return subscribeToConversation(targetConversationId);
    },
    [subscribeToConversation],
  );

  useEffect(() => {
    if (!enabled || startedRef.current) {
      return;
    }
    startedRef.current = true;

    let unsubscribe: (() => void) | undefined;

    async function init() {
      setLoadState("loading");
      const supabase = supabaseRef.current;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          setErrorMessage(
            "セッションを開始できませんでした。時間をおいて再度お試しください。",
          );
          setLoadState("error");
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "セッションを開始できませんでした。時間をおいて再度お試しください。",
        );
        setLoadState("error");
        return;
      }

      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("*")
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConversation) {
        const conversation = existingConversation as ConversationRow;
        setConversationId(conversation.id);
        setConversationStatus(conversation.status);
        unsubscribe = await loadMessagesAndSubscribe(conversation.id);
      }

      setLoadState("ready");
    }

    init();

    return () => {
      unsubscribe?.();
    };
  }, [enabled, loadMessagesAndSubscribe]);

  const sendMessage = useCallback(
    async (content: string) => {
      setErrorMessage(null);
      setIsSending(true);

      const result = await sendCustomerMessage(conversationId, content);

      setIsSending(false);

      if (!result.success) {
        setErrorMessage(result.error ?? "送信に失敗しました。");
        return result;
      }

      if (!conversationId && result.conversationId) {
        setConversationId(result.conversationId);
        setConversationStatus("ai_handling");
        // このメッセージ挿入はsubscribe開始前に行われているため、
        // 必ずfetchで取りに行く（subscribeだけでは取りこぼす）。
        await loadMessagesAndSubscribe(result.conversationId);
      }

      return result;
    },
    [conversationId, loadMessagesAndSubscribe],
  );

  return {
    loadState,
    conversationId,
    conversationStatus,
    messages,
    isSending,
    errorMessage,
    sendMessage,
  };
}
