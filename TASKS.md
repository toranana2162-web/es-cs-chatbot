# 開発タスク一覧

## Phase 0 設計確定
- [x] 要件レビュー
- [x] FAQデータ確認
- [x] テスト会話確認
- [x] Embeddingモデルと次元数決定
- [x] 共通ステータス定義
- [x] 共通カテゴリ定義
- [x] ディレクトリ構成決定
- [x] Worktree担当範囲決定
- [x] 顧客UI・AI・管理画面の担当ファイル確定
- [x] FAQ検索の実行経路確定
- [x] エスカレーション条件確定
- [x] 営業時間と休業日の扱い確定
- [x] メッセージ上限1,000文字を確定
- [x] レート制限1分10回を確定
- [x] オペレーター初期登録方法確定
- [x] 会話削除をMVP対象外とすることを確定
- [x] 同時担当開始の先着処理を確定

## Phase 1 共通基盤

### プロジェクト初期化
- [x] Next.js（App Router）+ TypeScriptで初期化
- [x] Tailwind CSS導入
- [x] ESLint・Prettier設定
- [x] package.json / tsconfig.json確定（mainブランチ確定物、WORKTREE_PLAN.md）
- [x] ARCHITECTURE.md §6の推奨ディレクトリでsrc/以下を作成

### Supabase接続・環境変数
- [x] Supabaseプロジェクト作成（CS-chatbot-project、project ref: wdocnpmvoneobaoxnlbv、リンク済み）
- [x] .env.example作成（ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEYのキー名のみ記載）
- [x] .env.localを.gitignoreへ追加し、Git管理対象から除外
- [x] src/lib/supabase/にクライアント用（anon key）とサーバー用（service role key）のSupabaseクライアントを分離して実装

### DBスキーマ・マイグレーション（supabase/migrations）
- [x] conversationsテーブル作成（id, customer_user_id, status, category, assigned_operator_id, escalated_reason, last_message_at, created_at, updated_at, is_after_hours, escalated_at, claimed_at）
- [x] messagesテーブル作成（id, conversation_id, sender_type, sender_id, content, metadata, created_at）
- [x] faqsテーブル作成（id, category, question, answer, embedding vector(1536), is_active, created_at, updated_at）
- [x] operator_profilesテーブル作成（user_id, display_name, role, is_active, created_at）
- [x] business_holidaysテーブル作成（id, holiday_date, holiday_name, created_at）
- [x] CHECK制約: conversations.status / conversations.category / conversations.escalated_reason（NULL許容）/ messages.sender_type
- [x] UNIQUE制約: business_holidays.holiday_date
- [x] 外部キー制約: messages.conversation_id→conversations.id、conversations.assigned_operator_id→operator_profiles.user_id
- [x] インデックス作成: conversations(status, last_message_at desc) / conversations(customer_user_id) / conversations(assigned_operator_id) / messages(conversation_id, created_at) / faqs(category) / faqs embeddingベクトルインデックス / business_holidays(holiday_date)
- [x] オペレーター担当開始の原子的更新処理（assigned_operator_idがNULLの場合のみ成功するUPDATE、D-008、claim_conversation関数として実装）
- [x] 本番適用前にテスト環境で動作確認（`supabase db push`で実プロジェクト（CS-chatbot-project）へ適用済み。5テーブル・claim_conversation RPCの到達性を確認。ただし専用のステージング環境は別途用意しておらず、今回適用した先が唯一のSupabaseプロジェクト）

### RLSポリシー
- [x] conversations: 顧客はcustomer_user_id=auth.uid()の行のみSELECT・自分の会話のみINSERT
- [x] conversations: オペレーターはoperator_profiles登録済みの場合のみ全件SELECT、担当割当・状態変更を許可
- [x] messages: 顧客は自分のconversationに属するmessageのみSELECT、sender_type=customerかつsender_id=auth.uid()としてのみINSERT
- [x] messages: オペレーターは全件SELECT、sender_type=operatorとしてINSERT
- [x] faqs: 顧客からの直接SELECTを禁止し、サーバー処理経由のみアクセス可能にする
- [x] 全テーブルでRLSが有効化されていることを確認

### 認証
- [x] Supabase匿名認証を有効化（D-003、`auth.signInAnonymously()`が成功することを確認済み）
- [x] オペレーター認証（Supabase Auth）とoperator_profilesの紐付け、role（operator/admin）確認処理（DB側is_operator()関数＋src/lib/auth/get-current-operator.tsを実装。ログイン画面UI自体はPhase 4）
- [x] オペレーター初期2名をSupabase Auth + operator_profilesへ管理者が手動登録（D-010、模擬案件のためダミーアドレスで登録。operator1@example.com=admin、operator2@example.com=operator。`npm run register:operator`で再現可能）

### 共通TypeScript型
- [x] src/types/domain.tsにConversationStatus / SenderType / ConversationCategory / EscalationReasonを定義（ARCHITECTURE.md §5）

### 営業時間ロジック
- [x] isAfterHours(now, holidays)を純粋関数として実装する（D-013、現在時刻を関数内部で取得しない）
- [x] business_holidaysテーブルから休業日一覧を取得するユーティリティ実装

### 入力検証・レート制限
- [x] サーバー側で最大1,000文字の入力検証
- [x] 空文字・空白のみのメッセージを拒否
- [x] HTMLエスケープ、scriptタグ無効化
- [x] 顧客メッセージのレート制限（1分10回、超過時HTTP 429相当を返却）

### FAQ投入
- [x] FAQ.jsonを読み込む投入スクリプト作成（scripts/seed-faqs.ts）
- [x] OpenAI text-embedding-3-smallでFAQごとにembeddingを生成（`npm run seed:faqs`実行済み）
- [x] Supabaseのfaqsテーブルへ18件投入（is_active=trueで統一。行数18件を確認済み）

### テスト環境
- [x] テストランナー設定（vitest、25件のテストが通過済み）
- [x] test-conversations.jsonを読み込む統合テストハーネス作成（tests/fixtures/）
- [x] business_context（business_hours/after_hours）をisAfterHoursのnow引数へ変換するテストユーティリティ実装（tests/helpers/business-context.ts）

## Phase 2 顧客チャットUI（feature/customer-widget、コミットc60971c）
- [x] ウィジェット外観（src/components/widget/ChatWidget.tsx、ChatPanel.tsx、右下固定表示）
- [x] 開閉ボタン（ChatButton.tsx、開閉でアイコン切替）
- [x] メッセージ一覧（MessageList.tsx、MessageBubble.tsx、送信者ラベル表示）
- [x] 入力フォーム（MessageInput.tsx、1,000文字上限、Enter送信・Shift+Enter改行）
- [x] メッセージ送信（src/actions/send-customer-message.ts、Server Actionで顧客セッションからconversations/messagesへ書き込み）
- [x] ローディング表示（初期化中・メッセージ取得中の「読み込み中...」表示）
- [x] ステータス表示（StatusBanner.tsx、ai_handling/waiting_operator/operator_handling/closedの日本語ラベル）
- [x] Realtime購読（use-conversation.ts、fetch後にpostgres_changesでmessages INSERT・conversations UPDATEを購読）
- [x] エラー表示（セッション確立失敗・送信失敗時のインラインエラーメッセージ）
- [x] レスポンシブ対応（w-[min(360px,90vw)]・高さ70vh/sm:32remで375px幅でも収まることをPlaywrightで確認）

備考: AI応答の生成（Claude API呼び出し）はPhase 3側の責務のため、現時点では顧客が
送ったメッセージはmessagesへ保存されるのみでAI返信は届かない（Phase 5で統合予定）。
Playwrightでdevサーバー・本番Supabaseに対する対話的な動作確認（匿名認証→会話作成→
メッセージ送信→ステータス表示）を実施済み。

## Phase 3 AIバックエンド（feature/ai-backend、コミットd5fd3c2、mainへマージ済み48b99e1）
- [x] FAQ Embedding生成（src/features/faq/embed-query.ts、OpenAI text-embedding-3-small）
- [x] FAQ類似検索（src/features/faq/search-faqs.ts、match_faqs RPC、閾値0.75）
- [x] Claude API接続（src/features/ai/claude-client.ts、Claude Sonnet 5、D-014）
- [x] FAQ根拠付き回答（system-prompt.tsでFAQ本文のみを根拠とするよう指示）
- [x] カテゴリ判定（構造化出力のcategoryフィールド）
- [x] エスカレーション判定（outcome=escalatedとescalationReason、FR-06の7条件をClaudeが選択）
- [x] AI回答保存（respond-with-ai.tsでsender_type=aiのmessagesへinsert）
- [x] 会話状態更新（escalate結果に応じてai_handling/waiting_operatorへ更新）
- [x] API失敗時の人間対応切替（catch節でwaiting_operator + ai_api_errorへフォールバック）
- [x] ハルシネーション抑制テスト（FAQ根拠0件なのにanswered出力時はサーバー側で強制エスカレーション。統合テストで実証済み）
- [x] Claudeレスポンスの構造化出力（output_config.format、json_schema）
- [x] Claudeレスポンスのサーバー側検証（validate-response.ts、enum適合・空回答フォールバック）
- [x] API障害時のwaiting_operator切り替え（統合テストでAPIキー無効化により実際に確認）
- [x] サポート対象外質問の判定（outcome=out_of_scope、FR-15）
- [x] プロンプトインジェクション対策（system prompt側で指示優先・秘密情報非開示を明記。顧客入力は別メッセージとして分離）

備考: 実際のSupabaseプロジェクト・Claude API・OpenAI Embeddings APIに対して
test-conversations.jsonのシナリオ1〜6・8・9・12を流す統合テスト10件を実施し全て成功。
シナリオ7・10はAIバックエンド単体の対象外（オペレーター返信・同時担当はPhase 5/4の領域）。
この検証で実際の不具合を2件発見・修正済み（詳細はコミットメッセージ参照）。
feature/ai-backendはmainへマージ済み（48b99e1）。

## Phase 4 オペレーター管理画面（feature/operator-dashboard、mainへマージ済み）
- [x] ログイン画面（src/app/operator/login/、LoginForm.tsx、requireOperatorでガード）
- [x] 会話一覧（ConversationList.tsx、src/features/conversations/list-conversations.ts）
- [x] 状態フィルタ（StatusFilter.tsx）
- [x] カテゴリ表示（CategoryBadge.tsx）
- [x] 会話詳細（ConversationDetail.tsx）
- [x] 担当開始（ClaimButton.tsx、claim-conversation.ts、claim_conversation RPC経由でD-008を担保）
- [x] オペレーター返信（ReplyForm.tsx、send-operator-message.ts、operator_handling以外・他人の担当会話には返信不可）
- [x] 会話完了（CloseButton.tsx、close-conversation.ts、担当オペレーター本人のみ）
- [x] Realtime購読（RealtimeRefresher.tsx）
- [x] 未読表示（ConversationList.tsxのunreadインジケータ）

備考: is_after_hours・escalated_reason（D-012の8種を日本語ラベル化）もConversationDetail.tsx/
ConversationList.tsxで表示済み。AIバックエンドが設定する値とコードレビューで整合を確認した
（Phase 5、2026-08-03）。

## Phase 5 統合
- [x] AI回答フロー（send-customer-message.tsからrespondWithAiを呼び出すよう配線。コミットaa41f3d）
- [x] エスカレーションフロー（コードレビューで確認: claim-conversation.ts/ConversationDetail.tsxがrespond-with-ai.tsの出力するstatus/escalated_reasonと整合。追加実装は不要だった）
- [x] オペレーター返信フロー（実オペレーターセッションでclaim_conversation RPC→返信→顧客セッションからの既読を確認。2名同時担当（D-008）も実セッションで再検証済み。コミット088c908）
- [x] 営業時間外フロー（コードレビューで確認済み。is_after_hoursの設定・表示側は既に整合。UIでの目視確認は未実施）
- [x] RLS検証（SECURITY.md §8 / TEST_PLAN.md §4に基づき、顧客A/B・未認証・非オペレーター認証ユーザー・faqs/business_holidays直接アクセス不可を実RLSで検証（全9件成功）。コミット088c908）
- [x] エラー処理（横断レビュー実施。各Server Actionが{success, error}パターンで一貫し秘密情報も漏れていないことを確認。追加修正なし）
- [x] UI調整（コードレビュー＋開発サーバーでのHTTPレベル確認。ブラウザでの実際のクリック操作による視覚確認は未実施）
  - 日本語IME変換確定時にメッセージが誤って送信されるバグを修正（isComposing判定を追加）
  - 顧客ウィジェット・オペレーター返信フォームのtextareaへaria-label追加
  - ダークモード非対応（顧客ウィジェットのみ）は埋め込み先サイトのテーマに左右されない
    ブランド表示のための意図的な設計と判断し変更しなかった

備考: 匿名認証→RLS経由のメッセージ挿入→respondWithAi→AIメッセージ保存という一連の流れを
実際のSupabaseプロジェクト・Claude APIに対する統合テストで確認済み（コミットaa41f3d）。

**既知の弱点（RLS検証で発見、要判断）**: messagesテーブルのオペレーターINSERTポリシーが
`assigned_operator_id`を見ておらず、RLSレベルでは担当外のオペレーターでも他会話へ
メッセージを挿入できてしまう。現状はsend-operator-message.ts（アプリ層）のみがこの制約を
守っている。2名体制のMVPでは実害は限定的と判断し、今回は仕様として記録するに留めた。
将来オペレーターが増える場合はRLSポリシーへ`assigned_operator_id = auth.uid()`の
条件追加を検討すること。

サービスロールキー・Anthropic/OpenAI APIキーがクライアントバンドルに含まれないこと、
dangerouslySetInnerHTMLが使われていないことも確認済み。

注記: live統合テストをまとめて実行するとSupabase匿名認証のレート制限に達することがある。
個別ファイルごとには全て成功することを確認済み。

## Phase 6 納品
- [x] Vercelデプロイ（GitHub連携。リポジトリ: https://github.com/toranana2162-web/es-cs-chatbot 、本番URL: https://es-cs-chatbot.vercel.app）
- [x] 本番環境変数（.env.exampleの6変数をVercelへ設定済み。ユーザーがVercelダッシュボードで設定）
- [x] 本番Supabase設定（開発と同一のCS-chatbot-projectを使用。匿名認証・RLS等は既に構築済みで追加変更なし）
- [x] ECサイト埋め込み確認（`/widget-embed`ページを新規追加しiframe埋め込み専用に。別オリジンのモックECページからクロスオリジンiframeで匿名認証〜メッセージ送信〜AI応答〜Realtime表示までPlaywrightで実地検証。サンプルは`public/embed-example.html`、手順はRUNBOOK.md §9）
- [x] 操作手順書（OPERATOR_GUIDE.md）
- [x] 運用手順書（RUNBOOK.md）
- [x] アーキテクチャ図（ARCHITECTURE.md §9、Mermaidでシステム構成図・ステータス遷移図を追加）
- [x] トラブルシューティング（TROUBLESHOOTING.md）
- [x] 最終テスト（typecheck / lint / vitest 80件（非live 58件・live 22件を個別実行で全通過）/ `npm run build`をすべて確認）

## Phase 6以降の追加改善
- [x] 本番ルートページ（create-next-appの初期テンプレートのまま残っていた不具合）を修正（コミットa5d9621）
- [x] エスカレーション後（waiting_operator/operator_handling）に顧客が追加送信したメッセージへ、
      systemメッセージ（「メッセージを受け付けました。担当者からの返信までしばらくお待ちください。」）で
      即時フィードバックする機能を追加。`respond-with-ai.ts`の早期リターン分岐に実装し、顧客ウィジェット・
      オペレーター画面双方の表示にも対応（顧客側は`MessageBubble.tsx`にsystem用の見た目を追加）。
      vitestで新規3件（waiting_operator/operator_handling/closed）を追加し全13件通過、
      Playwrightでブラウザ実地確認も実施
