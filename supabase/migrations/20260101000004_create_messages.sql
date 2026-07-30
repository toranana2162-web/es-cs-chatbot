-- DATABASE.md §3 messages
-- 「messagesは原則追記のみ」（DATABASE.md §7）はUPDATE/DELETEを許可しないRLSポリシー側で担保する
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'ai', 'operator', 'system')),
  sender_id uuid,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
