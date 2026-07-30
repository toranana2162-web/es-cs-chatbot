-- DATABASE.md §8 インデックス
create index conversations_status_last_message_at_idx
  on public.conversations (status, last_message_at desc);

create index conversations_customer_user_id_idx
  on public.conversations (customer_user_id);

create index conversations_assigned_operator_id_idx
  on public.conversations (assigned_operator_id);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);

create index faqs_category_idx
  on public.faqs (category);

-- 類似度閾値0.75（D-011）はコサイン類似度前提のためvector_cosine_opsを使用する
create index faqs_embedding_idx
  on public.faqs using hnsw (embedding vector_cosine_ops);

-- business_holidays(holiday_date)はUNIQUE制約により自動的にインデックスが作成されるため、
-- ここでの重複作成は行わない
