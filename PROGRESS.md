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
- Phase 5（統合）完了
- Phase 6（納品）着手。ドキュメント4種・EC埋め込み・最終テストが完了、
  Vercelデプロイ関連（デプロイ本体・本番環境変数・本番Supabase設定）が残る

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
- Phase 2・3の作業を一区切りとして報告済み。続けてPhase 5の残りに着手（コミット088c908）
  - 既知パスワードの使い捨てオペレーターアカウントを作るテストヘルパーを追加
    （実オペレーターはnpm run register:operatorがパスワードを保存しないためテスト不可）
  - オペレーター返信フローを実オペレーターセッションで検証: 担当開始
    （claim_conversation RPC）→返信→顧客セッションからの既読を確認。2名同時担当
    （D-008）も実セッションで再検証し、先着1名だけが成功することを確認
  - RLS境界をSECURITY.md §8 / TEST_PLAN.md §4に基づき実RLSに対して検証（全9件成功）:
    顧客A/Bの分離、未認証者のアクセス不可、非オペレーター認証ユーザーの権限不所持、
    faqs/business_holidaysへの顧客直接アクセス不可
  - **既知の弱点を発見**: messagesのオペレーターINSERT用RLSポリシーが
    assigned_operator_idを見ておらず、担当外オペレーターでも他会話へメッセージを
    挿入できてしまう（アプリ層のみでガード）。2名体制のMVPでは実害限定的として
    今回は仕様として記録するに留めた。将来オペレーターが増える場合は要修正
  - service role key・Anthropic/OpenAI APIキーがクライアントバンドルに含まれない
    こと、dangerouslySetInnerHTML不使用を確認
  - エラー処理を横断レビューし追加修正なしと判断
  - 注記: live統合テストを全部まとめて実行するとSupabase匿名認証のレート制限に
    達することがある（個別実行では全て成功）
- Phase 5の残りだったUI調整に着手（コミット7a0b1d5）
  - コードレビュー＋開発サーバーでのHTTPレベル確認（widget-preview、operator/login、
    operator）を実施。レンダリングエラーなし
  - 顧客ウィジェットのMessageInput.tsxで、日本語IME変換確定のEnterキーもメッセージ
    送信として扱ってしまうバグを発見・修正（isComposing判定を追加）。日本語UIの
    製品として重要な修正
  - 顧客ウィジェット・オペレーター返信フォームのtextareaへaria-label追加
  - ダークモード非対応（顧客ウィジェットのみ）はブランド表示のための意図的な設計と
    判断し変更しなかった
  - ブラウザでの実際のクリック操作による視覚確認は引き続き未実施
- これでPhase 5（統合）が完了した

### 2026-08-04
- Phase 6（納品）に着手（コミット予定）
  - 操作手順書（OPERATOR_GUIDE.md）、運用手順書（RUNBOOK.md）、
    トラブルシューティングガイド（TROUBLESHOOTING.md）を新規作成
  - ARCHITECTURE.md §9にMermaidでシステム構成図・会話ステータス遷移図を追加
  - ECサイト埋め込み用に`/widget-embed`ページ（ChatWidgetのみを描画、body透過）を新規追加。
    別オリジンの模擬ECページからクロスオリジンiframeで埋め込み、匿名認証→メッセージ送信→
    AI応答→Realtime表示までPlaywrightで実地検証し成功。第三者Cookie制限による問題は
    発生しなかった。埋め込みサンプルは`public/embed-example.html`、手順はRUNBOOK.md §9
  - 検証で作成したテスト用会話データはSupabaseから削除済み
  - 最終テスト一式を実施し全て成功: typecheck、lint、vitest 80件
    （非live 58件 + live 22件を個別実行）、`npm run build`
  - TASKS.md Phase 6の該当項目を更新

## 次の作業
1. Vercelデプロイ方針をユーザーと確認（GitHub連携 or Vercel CLI直接デプロイ）
2. Vercelデプロイ・本番環境変数・本番Supabase設定（要ユーザーのアカウント操作）
3. RLSで見つかったオペレーターINSERTポリシーの弱点への対応要否を判断する（RUNBOOK.md §8）
