import Link from "next/link";

/**
 * ルートページ。顧客はEC埋め込み経由（/widget-embed）でのみウィジェットに触れ、
 * このドメインへ直接アクセスすることは想定していない。関係者向けの簡単な案内のみ表示する。
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        BOTANICA カスタマーサポート
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        ECサイト向けカスタマーサポートチャットボットの管理サーバーです。
        このページ自体はエンドユーザー向けではありません。
      </p>
      <div className="flex flex-col gap-3 text-sm sm:flex-row">
        <Link
          href="/operator/login"
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          オペレーターログイン
        </Link>
        <Link
          href="/widget-preview"
          className="rounded-md border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          ウィジェットプレビュー
        </Link>
      </div>
    </main>
  );
}
