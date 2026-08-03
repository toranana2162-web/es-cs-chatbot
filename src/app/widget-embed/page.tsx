"use client";

import { useEffect } from "react";
import { ChatWidget } from "@/components/widget/ChatWidget";

/**
 * ECサイトへiframeで埋め込むための最小ページ。ChatWidget以外は何も描画しない。
 * bodyの背景を透過にし、iframeの矩形がホスト側ページを覆わないようにする。
 */
export default function WidgetEmbedPage() {
  useEffect(() => {
    const original = document.body.style.background;
    document.body.style.background = "transparent";
    return () => {
      document.body.style.background = original;
    };
  }, []);

  return <ChatWidget />;
}
