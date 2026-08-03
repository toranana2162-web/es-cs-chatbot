# ECサイト向けCSチャットボット 設計書一式

## プロジェクト概要
D2Cブランド「BOTANICA」を想定した、ECサイト向けカスタマーサポートチャットボットのMVPを開発する。

顧客向けチャットUI、FAQベースのAI自動応答、オペレーター管理画面、Supabaseによる会話履歴保存とリアルタイム通信を統合する。

## MVPの目的
月間約500件の問い合わせに対して、FAQで回答できる内容をAIが即時対応し、回答できない内容のみ人間のオペレーターへ引き継ぐ。

## ドキュメント一覧
- REQUIREMENTS.md：要件定義書
- ARCHITECTURE.md：アーキテクチャ設計書（§9にシステム構成図・ステータス遷移図）
- DATABASE.md：データベース設計書
- SECURITY.md：セキュリティ設計書
- TASKS.md：開発タスク
- TEST_PLAN.md：テスト計画書
- DECISIONS.md：設計判断記録
- PROGRESS.md：進捗管理
- WORKTREE_PLAN.md：Worktree並列開発計画
- OPERATOR_GUIDE.md：操作手順書（オペレーター向け）
- RUNBOOK.md：運用手順書（環境変数・オペレーター登録・監視・ECサイト埋め込み方法など）
- TROUBLESHOOTING.md：トラブルシューティングガイド
