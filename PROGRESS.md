# 開発進捗

## プロジェクト開始
開始日：2026-07-27

## 現在の状態
- ヒアリング完了
- 提案承認
- 要件定義・設計作成完了（Phase 0）
- 共通基盤実装完了（Phase 1、外部手続き含めて完了）
- Phase 2（顧客チャットUI）実装完了、mainへマージ済み
- Phase 4（オペレーター管理画面）実装完了、mainへマージ済み
- Phase 3（AIバックエンド）実装完了、mainへマージ済み
- Phase 2・3・4すべてmainへマージ済み
- Phase 5（統合）が未着手

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
- feature/operator-dashboardでPhase 4（オペレーター管理画面）を実装しmainへマージ
  （ログイン画面、会話一覧・詳細、担当開始、返信、会話完了、Realtime購読等）
- feature/ai-backendでPhase 3（AIバックエンド）を実装（コミットd5fd3c2）
  - FAQ検索（embedding生成 + match_faqs RPC、閾値0.75）
  - Claude Sonnet 5（D-014）へ構造化出力（output_config.format）で問い合わせ、
    outcome（answered/escalated/out_of_scope）でFR-05/FR-06/FR-15を分岐
  - FAQ根拠が0件なのにansweredを選んだ場合はサーバー側で強制的にエスカレーションへ
    上書きするハルシネーション抑制ガードを実装
  - Claude API障害時はwaiting_operator + ai_api_errorへフォールバック
  - 実際のSupabaseプロジェクト・Claude API・OpenAI Embeddings APIに対して
    test-conversations.jsonのシナリオ1〜6・8・9・12を流す統合テスト10件を実施し全て成功。
    この過程で「特定商品の在庫確認をFAQの一般案内だけで回答してしまう」システムプロンプトの
    不備と、テストのシナリオID誤りを発見・修正
  - get-holidays.tsのadmin client参照をcreate-admin-client.ts経由へ変更（mainへ反映済み）。
    server-onlyガードがVitestからの直接テストを妨げていたため

### 2026-08-03
- feature/ai-backendをmainへマージ（fast-forward、48b99e1）
- マージ後、npm install・typecheck・lint・vitest（65件、実際のClaude/Supabase呼び出しを
  含む統合テスト10件含む）・buildをすべて再確認し、問題なし
- これでPhase 2・3・4がすべてmainへマージ済みとなった
- Phase 5（統合）に着手
  - send-customer-message.tsからrespondWithAiを呼び出すよう配線（コミットaa41f3d）。
    respondWithAiはai_handling以外の会話には何もしないため常に呼んでよく、失敗しても
    顧客メッセージ自体は保存済みのため成功として返す
  - オペレーター管理画面側（claim-conversation.ts、send-operator-message.ts、
    ConversationDetail.tsx等）をコードレビューし、AIバックエンドが設定するstatus/
    escalated_reason/is_after_hoursと既に整合していることを確認。エスカレーション
    フロー・営業時間外フローの追加実装は不要だった
  - 匿名認証→RLS経由のメッセージ挿入→respondWithAi→AIメッセージ保存という一連の
    流れを実際のSupabaseプロジェクト・Claude APIに対する統合テストで検証し成功
  - TASKS.mdのPhase 4チェックリストが実装済みにもかかわらず未チェックのままだった
    ことに気づき、あわせて修正した
- Phase 2・3の作業を一区切りとして報告済み。Phase 5は途中（下記「次の作業」参照）

## 次の作業
1. Phase 5の残り: オペレーター返信フローの通し動作確認、RLS検証（SECURITY.md §8の
   フルチェック: 顧客Aが顧客Bの会話を読めないこと等）、エラー処理の統合後見直し、UI調整
