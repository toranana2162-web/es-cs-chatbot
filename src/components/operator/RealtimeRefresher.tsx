"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * conversations / messagesの変更をRealtime購読し、Server Componentのデータを再取得させる。
 * 個々のページでクライアント側の状態を持たせず、router.refresh()による再フェッチに寄せることで
 * 会話一覧・会話詳細どちらの画面にも同じ仕組みで反映できるようにしている。
 * 複数イベントが短時間に届いた場合はデバウンスしてrefreshをまとめる。
 */
export function RealtimeRefresher() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, 300);
    };

    const channel = supabase
      .channel("operator-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
