// SECURITY.md §6: 入力検証はクライアント側とサーバー側の両方で行う。ここはサーバー側の検証。

export const MAX_MESSAGE_LENGTH = 1000;

export class MessageValidationError extends Error {}

/**
 * 空文字・空白のみ・最大文字数超過を拒否する。
 * URLの自動リンク化は行わない（SECURITY.md §6）。React側のテキスト描画は既定でHTMLエスケープされるが、
 * 保存時にも escapeHtml で明示的にエスケープし、メール通知や管理画面エクスポート等の
 * dangerouslySetInnerHTMLを使わない経路以外へ流用された場合の防御を二重にする。
 */
export function validateMessageContent(content: string): string {
  if (content.trim().length === 0) {
    throw new MessageValidationError("メッセージが空です");
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new MessageValidationError(
      `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください`,
    );
  }

  return content;
}

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
