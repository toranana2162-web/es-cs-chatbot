# トラブルシューティングガイド

## 1. 顧客ウィジェット

### AIから返信が来ない

1. `conversations.status`を確認する。`ai_handling`のまま止まっている場合、`respond-with-ai.ts`の実行自体が失敗している可能性がある。Vercelのサーバーログ（Function Logs）で`respondWithAi failed`のエラーメッセージを確認する（`send-customer-message.ts`が失敗をcatchしログ出力する設計）。
2. `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`が正しく設定されているか確認する（Vercel Project Settings → Environment Variables）。
3. Claude APIが実際に障害中の場合はD-007の設計により`waiting_operator`（`escalated_reason=ai_api_error`）へ自動的に切り替わる。これは異常ではなく設計通りの挙動であり、オペレーターが手動対応する。

### メッセージを送信できない・ボタンが反応しない

- 1,000文字を超えていないか確認する（`MAX_MESSAGE_LENGTH`、`src/lib/validation/message.ts`）。
- レート制限（1分10回）を超えていないか確認する。超過時はエラーメッセージが表示される。
- ブラウザのコンソールでSupabase匿名認証（`auth.signInAnonymously()`）が失敗していないか確認する。Supabaseダッシュボードで匿名認証が有効になっているか確認する（Authentication → Providers → Anonymous）。

### Realtimeでメッセージが即座に反映されない

- Supabaseダッシュボード → Database → Replication で`conversations`・`messages`が`supabase_realtime` publicationに含まれているか確認する（`20260101000011_enable_realtime.sql`で登録済みのはずだが、DBを作り直した場合は再適用が必要）。
- ページをリロードすれば最新状態は取得できる（fetch-then-subscribeで初期状態は都度取得している）。リロードでも直らない場合はDB側の実データを確認する。

### 日本語入力でEnterを押すと変換確定だけでメッセージが送信されてしまう

- Phase 5で修正済み（`MessageInput.tsx`の`isComposing`判定）。再発する場合はブラウザ・IMEの組み合わせによる`isComposing`非対応の可能性があるため、`event.keyCode === 229`のフォールバックが効いているか確認する。

## 2. オペレーター管理画面

### ログインできない

- メールアドレス・パスワードが正しいか確認する。
- そのメールアドレスが`operator_profiles`に登録されているか確認する（Auth登録だけでは不十分。D-010）。
- パスワードを忘れた場合、本MVPにはリセット画面がないため管理者が`npm run register:operator`で作り直すか、Supabaseダッシュボードから直接パスワードを再設定する。

### 「担当開始」がエラーになる

- 既に別のオペレーターが担当開始している（D-008の先着1名ルールによる正常な拒否）。一覧を再読み込みして担当状況を確認する。

### 担当外の会話にも返信できてしまうように見える／見えるべきでない会話が見える

- 既知の設計上の弱点として、messagesのRLS INSERTポリシーが担当者チェックをしていない（RUNBOOK.md §8参照）。UI上はアプリロジックで担当者以外に返信フォームを表示しないため通常操作では発生しない。API直叩き等の異常な操作を検知した場合は開発者へ連絡する。

## 3. AIバックエンド（開発者向け）

### `server-only`インポートエラーでテストが失敗する

`server-only`パッケージをインポートしているファイルはNode/vitestから直接importできない（Next.jsのサーバーコンポーネント専用ガードのため）。AIバックエンドの内部モジュール（`search-faqs.ts`, `embed-query.ts`, `claude-client.ts`等）は`server-only`を付けていない設計にしている。もし付与してしまった場合は削除する。Adminクライアントは`src/lib/supabase/admin.ts`（`server-only`あり、アプリのServer Actionから使用）と`create-admin-client.ts`（ガードなし、テスト・スクリプトから使用）を使い分ける。

### FAQ検索がヒットしない・関係ないFAQがヒットする

- 類似度閾値は0.75（D-011）。`match_faqs` RPCの閾値パラメータを確認する。
- FAQ.jsonの`question`文言とembeddingが一致しているか確認する（`question`を編集した場合はembeddingの再生成が必要。RUNBOOK.md §4）。

### PostgREST RPCの戻り値がある/ないの判定を誤る

`claim_conversation`などsingle row RPCは、該当行がない場合に`null`ではなく**全カラムがnullのオブジェクト**を返す（PostgRESTの仕様）。判定は`result === null`ではなく`result?.id`の有無で行うこと（`claim-conversation.ts`の実装を参照）。

### 統合テスト（`*.live.test.ts`）をまとめて実行すると失敗する

Supabaseの匿名サインインにはレート制限がある。まとめて実行すると制限に達して一部が失敗することがある。個別ファイルごとに`npx vitest run <file>`で実行すれば通ることを確認済み（TASKS.md Phase 5参照）。CI等で全件実行する場合は実行間隔を空けるか、テスト用の別Supabaseプロジェクトを用意することを検討する。

## 4. デプロイ・環境変数

### Vercelビルドが失敗する

- ローカルで`npm run build`が通ることを先に確認する。
- 環境変数が1つでも未設定だとビルド自体は通ることがあるが、実行時にサーバーエラーになる場合がある（`.env.example`の6変数がすべて設定されているか確認）。

### 本番で動くが開発環境で動かない（またはその逆）

- 同一のSupabaseプロジェクトを開発・本番で共有している構成のため（RUNBOOK.md §1）、通常はこのパターンは起きにくい。環境変数のコピーミス（改行混入・引用符混入等）を疑う。

## 5. それでも解決しない場合

1. Vercel Function Logs、Supabaseダッシュボードのログ、ブラウザのコンソール・Networkタブを確認する。
2. `git log`で直近の変更を確認し、問題発生時期と照合する。
3. DECISIONS.mdを確認し、既知の設計判断・トレードオフに起因する挙動でないか確認する。
