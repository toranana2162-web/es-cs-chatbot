"use client";

import { useState } from "react";
import { useConversation } from "./hooks/use-conversation";
import { ChatButton } from "./ChatButton";
import { ChatPanel } from "./ChatPanel";

/**
 * ECサイトへ埋め込む顧客向けチャットウィジェットのエントリーポイント。
 * 画面右下に固定表示する。
 * useConversationをここで呼び、isOpenをenabledへ渡すことで、パネルを開くまで
 * 匿名セッション作成・Realtime購読を遅延させつつ、パネルの開閉自体では
 * 会話状態が失われないようにする（ChatPanel側で呼ぶとopen/closeのたびに
 * アンマウントされ状態がリセットされてしまうため）。
 */
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const conversation = useConversation(isOpen);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <ChatPanel
          onClose={() => setIsOpen(false)}
          conversation={conversation}
        />
      ) : null}
      <ChatButton
        isOpen={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />
    </div>
  );
}
