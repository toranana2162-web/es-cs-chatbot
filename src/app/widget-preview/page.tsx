import { ChatWidget } from "@/components/widget/ChatWidget";

/**
 * 実際のECサイトに埋め込む前に、ウィジェット単体の見た目・動作を確認するための
 * プレビュー専用ページ。本番のページ本体には含めない。
 */
export default function WidgetPreviewPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-gray-900">
          ウィジェットプレビュー（BOTANICA）
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          右下のボタンからチャットウィジェットを開閉できます。実際のECサイトを模した本文はここに表示されます。
        </p>
      </div>
      <ChatWidget />
    </main>
  );
}
