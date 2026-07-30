# データベース設計書

## 1. テーブル一覧
- conversations
- messages
- faqs
- operator_profiles
- business_holidays

## 2. conversations

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | ○ | 会話ID |
| customer_user_id | uuid | ○ | 匿名認証を含む顧客ID |
| status | text | ○ | 会話状態 |
| category | text |  | 問い合わせカテゴリ |
| assigned_operator_id | uuid |  | 担当オペレーター |
| escalated_reason | text |  | 引き継ぎ理由（EscalationReasonのいずれか。非エスカレーション時はNULL） |
| last_message_at | timestamptz | ○ | 最終メッセージ時刻 |
| created_at | timestamptz | ○ | 作成日時 |
| updated_at | timestamptz | ○ | 更新日時 |
| is_after_hours | boolean | ○ | 営業時間外に発生した待機案件か |
| escalated_at | timestamptz |  | エスカレーション日時 |
| claimed_at | timestamptz |  | オペレーターが担当開始した日時 |

## 3. messages

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | ○ | メッセージID |
| conversation_id | uuid | ○ | 会話ID |
| sender_type | text | ○ | customer / ai / operator / system |
| sender_id | uuid |  | 送信者ID |
| content | text | ○ | 本文 |
| metadata | jsonb |  | FAQ参照情報など |
| created_at | timestamptz | ○ | 作成日時 |

## 4. faqs

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | ○ | FAQ ID |
| category | text | ○ | カテゴリ |
| question | text | ○ | 質問 |
| answer | text | ○ | 回答 |
| embedding | vector(1536) |  | 検索用ベクトル（OpenAI text-embedding-3-small、D-011） |
| is_active | boolean | ○ | 利用可否 |
| created_at | timestamptz | ○ | 作成日時 |
| updated_at | timestamptz | ○ | 更新日時 |

## 5. operator_profiles

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| user_id | uuid | ○ | auth.users参照 |
| display_name | text | ○ | 表示名 |
| role | text | ○ | operator / admin |
| is_active | boolean | ○ | 有効か |
| created_at | timestamptz | ○ | 作成日時 |

## 6. business_holidays

| カラム | 型 | 必須 | 説明 |
|---|---|---:|---|
| id | uuid | ○ | 休業日ID |
| holiday_date | date | ○ | 休業日の日付 |
| holiday_name | text | ○ | 休業日の名称 |
| created_at | timestamptz | ○ | 作成日時 |

営業時間は平日10:00〜18:00で固定する。土曜日・日曜日、および本テーブルに登録された日付は営業時間外として扱う。曜日判定はアプリ側で行い、祝日・特別休業日のみ本テーブルで管理する。

## 7. 制約
- messages.conversation_idはconversations.idを参照
- 会話削除時は関連メッセージを削除
- assigned_operator_idはoperator_profiles.user_idを参照
- status、sender_type、category、escalated_reasonはCHECK制約を設定（escalated_reasonはNULLを許容する）
- messagesは原則追記のみ
- is_after_hoursの初期値はfalseとする
- assigned_operator_idが設定された場合はstatusをoperator_handlingとする
- statusがclosedの場合は新規メッセージ送信を原則禁止する
- オペレーターの担当開始は、assigned_operator_idがNULLの場合だけ成功する原子的なDB更新で行う
- business_holidays.holiday_dateはUNIQUE制約を設定する

## 8. インデックス
- conversations(status, last_message_at desc)
- conversations(customer_user_id)
- conversations(assigned_operator_id)
- messages(conversation_id, created_at)
- faqs(category)
- FAQ embedding用ベクトルインデックス
- business_holidays(holiday_date)

## 9. FAQ検索とEmbedding

FAQ検索にはpgvectorを利用する。
使用するEmbeddingモデルはOpenAI text-embedding-3-small、ベクトル次元数は1536に確定する（選定理由はDECISIONS.md D-011を参照）。
FAQ検索では、顧客メッセージをEmbedding化し、類似度が高い上位3件を取得する。
類似度の初期閾値は0.75（コサイン類似度）とし、テスト結果をもとに調整する。閾値未満の場合はFAQに根拠がないものとしてエスカレーションする。
モデルを変更する場合は、embedding列の型変更と全FAQの再Embeddingが必要になるため、DECISIONS.mdへ変更理由を記録してから対応する。

## 10. マイグレーション
- `supabase/migrations`で履歴管理
- 管理画面への直接貼り付けだけで終わらせない
- 本番適用前にテスト環境で確認

## 11. 会話削除方針
MVPの管理画面には会話削除機能を実装しない。
`ON DELETE CASCADE`は、管理者がDB上で会話を削除した場合に孤立したメッセージを残さないための保険として設定する。
通常運用では会話を物理削除せず、statusを`closed`へ変更して保持する。
個人情報削除や保存期間に関する正式な要件が発生した場合は、削除申請フローと保存期間を別途設計する。
