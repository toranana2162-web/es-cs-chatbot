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
- [ ] Next.js（App Router）+ TypeScriptで初期化
- [ ] Tailwind CSS導入
- [ ] ESLint・Prettier設定
- [ ] package.json / tsconfig.json確定（mainブランチ確定物、WORKTREE_PLAN.md）
- [ ] ARCHITECTURE.md §6の推奨ディレクトリでsrc/以下を作成

### Supabase接続・環境変数
- [ ] Supabaseプロジェクト作成
- [ ] .env.example作成（ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEYのキー名のみ記載）
- [ ] .env.localを.gitignoreへ追加し、Git管理対象から除外
- [ ] src/lib/supabase/にクライアント用（anon key）とサーバー用（service role key）のSupabaseクライアントを分離して実装

### DBスキーマ・マイグレーション（supabase/migrations）
- [ ] conversationsテーブル作成（id, customer_user_id, status, category, assigned_operator_id, escalated_reason, last_message_at, created_at, updated_at, is_after_hours, escalated_at, claimed_at）
- [ ] messagesテーブル作成（id, conversation_id, sender_type, sender_id, content, metadata, created_at）
- [ ] faqsテーブル作成（id, category, question, answer, embedding vector(1536), is_active, created_at, updated_at）
- [ ] operator_profilesテーブル作成（user_id, display_name, role, is_active, created_at）
- [ ] business_holidaysテーブル作成（id, holiday_date, holiday_name, created_at）
- [ ] CHECK制約: conversations.status / conversations.category / conversations.escalated_reason（NULL許容）/ messages.sender_type
- [ ] UNIQUE制約: business_holidays.holiday_date
- [ ] 外部キー制約: messages.conversation_id→conversations.id、conversations.assigned_operator_id→operator_profiles.user_id
- [ ] インデックス作成: conversations(status, last_message_at desc) / conversations(customer_user_id) / conversations(assigned_operator_id) / messages(conversation_id, created_at) / faqs(category) / faqs embeddingベクトルインデックス / business_holidays(holiday_date)
- [ ] オペレーター担当開始の原子的更新処理（assigned_operator_idがNULLの場合のみ成功するUPDATE、D-008）
- [ ] 本番適用前にテスト環境で動作確認

### RLSポリシー
- [ ] conversations: 顧客はcustomer_user_id=auth.uid()の行のみSELECT・自分の会話のみINSERT
- [ ] conversations: オペレーターはoperator_profiles登録済みの場合のみ全件SELECT、担当割当・状態変更を許可
- [ ] messages: 顧客は自分のconversationに属するmessageのみSELECT、sender_type=customerかつsender_id=auth.uid()としてのみINSERT
- [ ] messages: オペレーターは全件SELECT、sender_type=operatorとしてINSERT
- [ ] faqs: 顧客からの直接SELECTを禁止し、サーバー処理経由のみアクセス可能にする
- [ ] 全テーブルでRLSが有効化されていることを確認

### 認証
- [ ] Supabase匿名認証を有効化（顧客識別、D-003）
- [ ] オペレーター認証（Supabase Auth）とoperator_profilesの紐付け、role（operator/admin）確認処理
- [ ] オペレーター初期2名をSupabase Auth + operator_profilesへ管理者が手動登録（D-010）

### 共通TypeScript型
- [ ] src/types/domain.tsにConversationStatus / SenderType / ConversationCategory / EscalationReasonを定義（ARCHITECTURE.md §5）

### 営業時間ロジック
- [ ] isAfterHours(now, holidays)を純粋関数として実装する（D-013、現在時刻を関数内部で取得しない）
- [ ] business_holidaysテーブルから休業日一覧を取得するユーティリティ実装

### 入力検証・レート制限
- [ ] サーバー側で最大1,000文字の入力検証
- [ ] 空文字・空白のみのメッセージを拒否
- [ ] HTMLエスケープ、scriptタグ無効化
- [ ] 顧客メッセージのレート制限（1分10回、超過時HTTP 429相当を返却）

### FAQ投入
- [ ] FAQ.jsonを読み込む投入スクリプト作成
- [ ] OpenAI text-embedding-3-smallでFAQごとにembeddingを生成
- [ ] Supabaseのfaqsテーブルへ18件投入（is_active=trueで統一）

### テスト環境
- [ ] テストランナー設定（vitest等）
- [ ] test-conversations.jsonを読み込む統合テストハーネス作成
- [ ] business_context（business_hours/after_hours）をisAfterHoursのnow引数へ変換するテストユーティリティ実装

## Phase 2 顧客チャットUI
- [ ] ウィジェット外観
- [ ] 開閉ボタン
- [ ] メッセージ一覧
- [ ] 入力フォーム
- [ ] メッセージ送信
- [ ] ローディング表示
- [ ] ステータス表示
- [ ] Realtime購読
- [ ] エラー表示
- [ ] レスポンシブ対応

## Phase 3 AIバックエンド
- [ ] FAQ Embedding生成
- [ ] FAQ類似検索
- [ ] Claude API接続
- [ ] FAQ根拠付き回答
- [ ] カテゴリ判定
- [ ] エスカレーション判定
- [ ] AI回答保存
- [ ] 会話状態更新
- [ ] API失敗時の人間対応切替
- [ ] ハルシネーション抑制テスト
- [ ] Claudeレスポンスの構造化出力
- [ ] Claudeレスポンスのサーバー側検証
- [ ] API障害時のwaiting_operator切り替え
- [ ] サポート対象外質問の判定
- [ ] プロンプトインジェクション対策

## Phase 4 オペレーター管理画面
- [ ] ログイン画面
- [ ] 会話一覧
- [ ] 状態フィルタ
- [ ] カテゴリ表示
- [ ] 会話詳細
- [ ] 担当開始
- [ ] オペレーター返信
- [ ] 会話完了
- [ ] Realtime購読
- [ ] 未読表示

## Phase 5 統合
- [ ] AI回答フロー
- [ ] エスカレーションフロー
- [ ] オペレーター返信フロー
- [ ] 営業時間外フロー
- [ ] RLS検証
- [ ] エラー処理
- [ ] UI調整

## Phase 6 納品
- [ ] Vercelデプロイ
- [ ] 本番環境変数
- [ ] 本番Supabase設定
- [ ] ECサイト埋め込み確認
- [ ] 操作手順書
- [ ] 運用手順書
- [ ] アーキテクチャ図
- [ ] トラブルシューティング
- [ ] 最終テスト
