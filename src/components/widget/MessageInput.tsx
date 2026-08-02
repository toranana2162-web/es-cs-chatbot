"use client";

import { useState } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation/message";

export function MessageInput({
  disabled,
  isSending,
  onSend,
}: {
  disabled: boolean;
  isSending: boolean;
  onSend: (content: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  const trimmedLength = value.trim().length;
  const canSend =
    !disabled &&
    !isSending &&
    trimmedLength > 0 &&
    value.length <= MAX_MESSAGE_LENGTH;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend) {
      return;
    }
    const content = value;
    setValue("");
    await onSend(content);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-gray-200 p-3"
    >
      <textarea
        aria-label="メッセージを入力"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // 日本語入力（IME）で変換候補を確定するEnterキーも拾ってしまうと、
          // 変換確定しただけで未完成のメッセージを送信してしまう。
          // isComposing（一部ブラウザではkeyCode 229）で変換中は送信しない。
          if (event.nativeEvent.isComposing || event.keyCode === 229) {
            return;
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
          }
        }}
        disabled={disabled}
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder={disabled ? "この会話は終了しました" : "メッセージを入力"}
        className="max-h-24 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
      >
        送信
      </button>
    </form>
  );
}
