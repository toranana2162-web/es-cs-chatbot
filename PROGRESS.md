# 開発進捗

## プロジェクト開始
開始日：2026-07-27

## 現在の状態
- ヒアリング完了
- 提案承認
- 要件定義・設計作成完了（Phase 0）
- 共通基盤実装完了（Phase 1、外部手続き含めて完了）
- feature/customer-widgetでPhase 2（顧客チャットUI）実装完了
- feature/ai-backend、feature/operator-dashboardは未着手

## 開発ログ

### 2026-07-27
- ECサイト向けCSチャットボット案件を開始
- MVPとPhase 2を切り分け
- 顧客UI、AIバックエンド、管理画面の3領域を定義
- Worktree並列開発を採用
- 要件定義書、アーキテクチャ、DB、セキュリティ、テスト、タスクを作成

### 2026-07-30
- 設計レビューを反映（Embeddingモデル決定、escalated_reason enum化、営業時間外判定の時刻注入方式決定）
- FAQ.json（18件）、test-conversations.json（シナリオ1〜12）を確定
- Phase 1共通基盤を実装しmainへコミット（git init〜初回コミット b0bd41d）
  - Next.js(App Router)+TypeScript+Tailwind、Supabaseクライアント（anon/server/admin）
  - DBマイグレーション5テーブル＋RLSポリシー＋claim_conversation関数
  - 共通TypeScript型、isAfterHours純粋関数、入力検証・レート制限、FAQ投入スクリプト
  - vitestテスト環境（25件のテストが通過）
- feature/customer-widget、feature/ai-backend、feature/operator-dashboardの3Worktreeを作成
- Prettier導入、コードベース全体をフォーマット

### 2026-07-31
- Supabaseプロジェクト（CS-chatbot-project、ref: wdocnpmvoneobaoxnlbv）を作成・リンク
- `supabase db push`でマイグレーション9本を本番DBへ適用し、5テーブル・claim_conversation RPCの到達性を確認
- supabase link時にDB接続文字列がsupabase/.temp/へキャッシュされる問題を発見し.gitignoreへ追加
- Supabaseダッシュボードで匿名認証を有効化し、`auth.signInAnonymously()`で動作確認
- ANTHROPIC_API_KEY・OPENAI_API_KEYを設定
- `npm run seed:faqs`でFAQ18件にembeddingを生成しfaqsテーブルへ投入（行数確認済み）
- オペレーター初期2名を登録（模擬案件のためダミーアドレス。operator1@example.com=admin、operator2@example.com=operator）。再登録用に`npm run register:operator`スクリプトを追加
- `getCurrentOperator()`ヘルパー（src/lib/auth/）を追加
- Phase 1の全タスクが完了し、実装を一旦区切り

### 2026-08-01
- Phase 2（顧客チャットUI）に着手。feature/customer-widget worktreeがmainから
  5コミット遅れていたため`git merge main`で同期し、`.env`をworktreeへ複製
- 実装中に判明した共通基盤のギャップをmainで修正しworktreeへ同期
  - conversations.last_message_at自動更新トリガー（顧客・オペレーターはUPDATE権限を
    持たないため誰も更新できなかった）
  - conversations/messagesがsupabase_realtime publicationに未登録だった
- feature/customer-widgetでPhase 2を実装（コミットc60971c）
  - src/actions/send-customer-message.ts（唯一のServer Action、AI応答生成は行わない）
  - ChatWidget/ChatButton/ChatPanel/MessageList/MessageBubble/MessageInput/StatusBanner
  - useConversation（匿名認証・会話復元・Realtime購読。fetch→subscribeの順序で
    新規会話1通目のメッセージ取りこぼしを回避）
  - src/app/widget-preview/ プレビューページ
  - vitest 43件通過、lint/typecheck/build/dev起動確認済み
- Playwrightでdevサーバー・本番Supabaseに対して対話的な動作確認を実施
  （匿名認証→会話作成→メッセージ送信→AI対応中ステータス表示、375px幅でのレイアウト崩れなし）
- feature/customer-widgetをmainへマージ（本コミット）

## 次の作業
1. feature/ai-backendでPhase 3（AIバックエンド）に着手
2. feature/operator-dashboardでPhase 4（オペレーター管理画面）に着手
