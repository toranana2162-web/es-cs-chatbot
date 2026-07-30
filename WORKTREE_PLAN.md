# Git Worktree並列開発計画

## 1. 方針
3領域を別Worktreeで開発する。

```text
ec-cs-chatbot/             main・統合用
ec-cs-chatbot-customer/    顧客チャットUI
ec-cs-chatbot-ai/          AIバックエンド
ec-cs-chatbot-operator/    オペレーター管理画面
```

## 2. Worktree作成前にmainで完成させるもの
- Next.js初期設定
- Supabase接続設定
- DBマイグレーション
- RLS
- 共通TypeScript型
- 環境変数サンプル
- 基本ディレクトリ
- ESLint、TypeScript、テスト設定

これらをコミットしてから分岐する。

## 3. ブランチ

```text
feature/customer-widget
feature/ai-backend
feature/operator-dashboard
```

## 4. 担当範囲

### mainブランチ・共通基盤

Worktree作成前にmainで確定する。

変更対象:

```text
supabase/migrations/
src/types/
src/lib/supabase/
.env.example
package.json
tsconfig.json
```

### feature/customer-widget

変更してよい主な場所:
- src/components/widget
- src/app/widget-preview
- src/actions/send-customer-message.ts
- 顧客UI専用テスト

変更しない:
- DBスキーマ
- RLS
- Claude API処理
- 管理画面

### feature/ai-backend

変更してよい主な場所:
- src/features/ai
- src/features/faq
- src/actions/respond-with-ai.ts
- AI専用テスト

変更しない:
- 顧客UI
- 管理画面
- 確定済みDBスキーマ

### feature/operator-dashboard

変更してよい主な場所:
- src/app/operator
- src/components/operator
- src/actions/send-operator-message.ts
- 管理画面専用テスト

変更しない:
- AI応答処理
- 顧客UI
- 確定済みDBスキーマ

## 5. 作成コマンド

```bash
git worktree add ../ec-cs-chatbot-customer -b feature/customer-widget
git worktree add ../ec-cs-chatbot-ai -b feature/ai-backend
git worktree add ../ec-cs-chatbot-operator -b feature/operator-dashboard
```

確認:

```bash
git worktree list
```

## 6. 統合順序
1. AIバックエンド
2. 顧客チャットUI
3. オペレーター管理画面

各マージ後に以下を実行する。

```bash
npm run lint
npm run test
npm run build
```

問題があれば次をマージしない。

## 7. Claude Codeへ共通で伝えるルール
- 最初に設計書一式を読む
- 自分の担当範囲のみ変更する
- DBスキーマ、RLS、共通型を独断で変えない
- 必要な変更がある場合は実装せず報告する
- 秘密情報をコード・ログ・ドキュメントへ書かない
- 実装後にテストする
- PROGRESS.mdには各ブランチの作業概要のみ記録する

## 8. 完了後
```bash
git worktree remove ../ec-cs-chatbot-customer
git worktree remove ../ec-cs-chatbot-ai
git worktree remove ../ec-cs-chatbot-operator
git worktree prune
```
