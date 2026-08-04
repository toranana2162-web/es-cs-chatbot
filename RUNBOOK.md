# 運用手順書

対象読者: 本システムを保守・運用する担当者（開発者 or 発注者側の管理者）。

## 1. システム構成の前提

- ホスティング: Vercel（Next.js）
- DB / 認証 / Realtime: Supabase（プロジェクト名: CS-chatbot-project、project ref: `wdocnpmvoneobaoxnlbv`）
- 外部API: Claude API（Anthropic）、OpenAI Embeddings API

本番・開発を問わず、現時点では上記の同一Supabaseプロジェクトを利用している（専用ステージング環境は用意していない。TASKS.md Phase 1参照）。環境を分離する場合はSupabaseプロジェクトを別途作成し、`.env`を差し替える。

## 2. 環境変数

`.env.example`に定義されている6つが必須。

| 変数名 | 用途 | 漏洩時の影響 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | 低（公開情報） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント側Supabase接続 | 低（RLS前提で公開されるキー） |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側のRLSバイパスアクセス | **重大**。漏洩時は全テーブルの読み書きが可能になる |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI操作（`supabase link`等）用 | 高。プロジェクト設定変更が可能になる |
| `ANTHROPIC_API_KEY` | Claude API呼び出し | 高。第三者による課金消費 |
| `OPENAI_API_KEY` | Embeddings API呼び出し | 高。第三者による課金消費 |

`SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`はサーバー専用（`NEXT_PUBLIC_`を付けない）。クライアントバンドルに含まれないことはPhase 5で確認済み（TASKS.md参照）。

### キーのローテーション手順

1. **Supabase service role key**: Supabaseダッシュボード → Project Settings → API → `service_role` key を再生成 → Vercelの環境変数を更新 → 再デプロイ。
2. **Anthropic / OpenAI APIキー**: 各プロバイダーのダッシュボードでキーを再発行 → 旧キーを無効化 → Vercelの環境変数を更新 → 再デプロイ。
3. ローテーション後は`npm run seed:faqs`など管理スクリプトもローカルの`.env`を更新すること。

## 3. オペレーターの追加・無効化

D-010の方針により、オペレーター登録・削除画面はない。管理者がCLIから操作する。

### 追加

```bash
npm run register:operator -- <email> <displayName> <operator|admin>
```

- 標準出力に一時パスワードが表示される。**この出力はその場限りで、後から再取得できない**ため、必ずコピーして本人へ安全な方法（口頭・対面等、チャット等の平文送付は避ける）で伝達する。
- 初回ログイン後にパスワードを変更する運用フローは現状未実装（Supabase Authのパスワードリセット機能を暫定利用する）。

### 無効化・削除

- 画面・スクリプトともに未実装。Supabaseダッシュボードから直接 `operator_profiles.is_active` を`false`に更新するか、`auth.users`から該当ユーザーを削除する。
- `is_active`はRLSポリシー・アプリロジックの両方で現状参照されていない点に注意（実質的な無効化にはAuth側のユーザー削除または無効化が必要）。将来対応が必要な既知のギャップ。

## 4. FAQの追加・更新

1. `FAQ.json`（リポジトリ直下）を編集する。
2. `npm run seed:faqs` を実行する。

**注意**: このスクリプトは追加のみ行い、既存行の更新・重複排除は行わない。既存FAQを更新する場合はSupabaseダッシュボードで該当行を削除してから再実行するか、SQLで直接UPDATEする（embeddingは`question`から生成されるため、questionを変更した場合はembeddingも再生成が必要）。

## 5. 休業日の更新

`business_holidays`テーブルへ直接INSERTする（管理画面・スクリプトなし）。

```sql
insert into business_holidays (holiday_date, holiday_name) values ('2026-12-31', '年末休業');
```

営業時間（平日10:00-18:00固定）はコード側（`src/lib/business-hours/is-after-hours.ts`）にハードコードされている。変更する場合はコード修正・再デプロイが必要。

## 6. マイグレーション

`supabase/migrations/`配下に12ファイルあり、`supabase db push`で本番プロジェクトへ適用済み。

- 新しいマイグレーションを追加する場合は、ファイル名の連番（`202601010000XX_`）を踏襲する。
- 適用前に必ず内容をレビューする。専用ステージング環境がないため、本番相当のプロジェクトに直接適用することになる。影響が大きい変更（既存カラムの削除・型変更等）は特に慎重に確認する。

## 7. 監視・障害時対応

MVPでは専用の監視ダッシュボード・アラートは未整備。現状の障害検知手段は以下。

- **Vercelダッシュボード**: デプロイ失敗、Function実行エラーのログ確認。
- **Supabaseダッシュボード**: DB接続数、Auth利用状況、Realtimeの状態。
- **Anthropic / OpenAIダッシュボード**: APIエラー率・レート制限・利用料金。

障害発生時の切り分け手順は[TROUBLESHOOTING.md](TROUBLESHOOTING.md)を参照。

### Claude API障害時の挙動

D-007の設計により、Claude API呼び出しが失敗した会話は自動的に`waiting_operator`（`escalated_reason=ai_api_error`）へ切り替わる。顧客メッセージは失われないが、API障害が続く間は全ての新規会話がオペレーター対応待ちに積み上がる点に注意（アラートは未実装のため、会話一覧の`waiting_operator`件数を目視で確認する運用になる）。

## 8. 既知の設計上の弱点（D-015: 対応しない方針で確定）

- **RLS: 担当外オペレーターによるmessages INSERT**（TASKS.md Phase 5参照）。messagesのオペレーター用INSERTポリシーが`assigned_operator_id`を見ていないため、RLSレベルでは担当外の会話にもメッセージを挿入できる。現状はアプリ層（`send-operator-message.ts`）のみで防いでいる。2名体制のMVPでは実害がないと判断し、D-015（DECISIONS.md）として対応しないことを正式に確定した。オペレーターが増える場合はRLSポリシーの修正を再検討する。
- **`operator_profiles.is_active`が未参照**（本書§3参照）。

## 9. ECサイトへの埋め込み

`/widget-embed`はチャットウィジェットのみを描画する埋め込み専用ページ（`src/app/widget-embed/page.tsx`）。ECサイト側では以下のiframeタグを1つ貼るだけでよい。サンプルは`public/embed-example.html`（デプロイ後は`/embed-example.html`で参照可能）。

```html
<iframe
  src="https://es-cs-chatbot.vercel.app/widget-embed"
  title="BOTANICA サポートチャット"
  style="position:fixed;bottom:0;right:0;width:400px;height:620px;border:none;background:transparent;z-index:999999;"
></iframe>
```

- `background: transparent`をiframe要素・widget-embedページ双方に設定しているため、ウィジェットの外側（余白部分）はホスト側ページが透けて見える。
- 別オリジン（実際のECサイトのドメイン）からのクロスオリジンiframe埋め込みで、匿名認証・メッセージ送信・AI応答・Realtime表示まで一連の動作をPhase 6で確認済み。Cookieの第三者コンテキスト制限（Safari ITP等）によるセッション不整合は発生しなかった。
- 幅・高さ（400×620px）は目安。ECサイト側のレイアウトに応じて調整してよい。

## 10. バックアップ

Supabaseの自動バックアップ設定（Point-in-Time Recovery等）はプラン・設定に依存する。本MVPでは追加設定を行っていないため、Supabaseダッシュボードでプランごとのバックアップ範囲を確認し、必要に応じて有効化すること。
