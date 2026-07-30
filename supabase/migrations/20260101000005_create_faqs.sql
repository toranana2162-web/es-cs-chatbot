-- DATABASE.md §4 faqs
-- embeddingはD-011（OpenAI text-embedding-3-small, 1536次元）に基づく
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in ('inventory', 'product', 'shipping', 'return', 'other')),
  question text not null,
  answer text not null,
  embedding vector(1536),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
