# 開発進捗

## プロジェクト開始
開始日：2026-07-27

## 現在の状態
- ヒアリング完了
- 提案承認
- 要件定義・設計作成完了（Phase 0）
- 共通基盤実装完了（Phase 1、コード面。Supabaseプロジェクト作成等の外部手続きは未完了）
- Worktree作成済み、各領域の実装前

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

## 残っている外部手続き（コードでは対応できない作業）
- Supabaseプロジェクトの実作成、.env.localへの実キー設定
- Supabaseダッシュボードで匿名認証を有効化
- オペレーター初期2名をSupabase Auth + operator_profilesへ登録
- マイグレーションの本番/検証環境への適用（`supabase db push`等）
- `npm run seed:faqs`によるFAQ18件の投入（OPENAI_API_KEY設定後）

## 次の作業
1. 上記の外部手続きを完了する
2. 各Worktreeで担当領域の実装に着手（Phase 2〜4）
