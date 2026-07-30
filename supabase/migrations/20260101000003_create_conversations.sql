-- DATABASE.md §2 conversations
-- 「assigned_operator_idが設定された場合はstatusをoperator_handlingとする」（DATABASE.md §7）は
-- クレーム時点の不変条件であり、closed後もassigned_operator_idは残るためテーブルCHECKにはしない。
-- claim_conversation関数（D-008）でstatusとassigned_operator_idを同時に更新することで担保する。
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users (id),
  status text not null default 'ai_handling'
    check (status in ('ai_handling', 'waiting_operator', 'operator_handling', 'closed')),
  category text
    check (category in ('inventory', 'product', 'shipping', 'return', 'other')),
  assigned_operator_id uuid references public.operator_profiles (user_id),
  escalated_reason text
    check (escalated_reason in (
      'customer_request',
      'faq_not_found',
      'low_similarity',
      'order_specific',
      'refund_or_payment_issue',
      'complaint',
      'ai_uncertain',
      'ai_api_error'
    )),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_after_hours boolean not null default false,
  escalated_at timestamptz,
  claimed_at timestamptz
);
