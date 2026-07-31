-- Phase 3実装で必要になったFAQ類似検索RPC（D-011: コサイン類似度、上位3件）。
-- faqsテーブルには顧客・オペレーターいずれのRLSポリシーも存在しない
-- （SECURITY.md §4: サーバー処理経由のみアクセス）ため、AIバックエンドは
-- 常にservice role（admin client）経由でこの関数を呼び出す想定。
create or replace function public.match_faqs(
  query_embedding vector(1536),
  match_count int default 3
)
returns table (
  id uuid,
  category text,
  question text,
  answer text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    faqs.id,
    faqs.category,
    faqs.question,
    faqs.answer,
    1 - (faqs.embedding <=> query_embedding) as similarity
  from public.faqs
  where faqs.is_active = true
  order by faqs.embedding <=> query_embedding
  limit match_count;
$$;
