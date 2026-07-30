-- SECURITY.md §1, §4: 全対象テーブルでRLSを有効化する
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.faqs enable row level security;
alter table public.operator_profiles enable row level security;
alter table public.business_holidays enable row level security;

-- オペレーター判定ヘルパー。
-- operator_profiles自体にもRLSがかかるため、SECURITY DEFINERでバイパスして判定する
-- （search_pathを固定し、なりすまし関数によるハイジャックを防ぐ）。
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operator_profiles
    where user_id = auth.uid() and is_active = true
  );
$$;

-- operator_profiles
-- 自分の行は常に閲覧可能。管理画面で担当者名を表示するため、オペレーターは全件閲覧可能とする
-- （SECURITY.mdに明記はないが、担当者表示に必要なため許可する。更新・削除ポリシーは設けない＝管理者がSQL/ダッシュボードで直接管理する）。
create policy "operator can view own profile"
  on public.operator_profiles for select
  using (user_id = auth.uid());

create policy "operators can view all operator profiles"
  on public.operator_profiles for select
  using (public.is_operator());

-- conversations
create policy "customers can view own conversations"
  on public.conversations for select
  using (customer_user_id = auth.uid());

create policy "customers can create own conversations"
  on public.conversations for insert
  with check (customer_user_id = auth.uid());

create policy "operators can view all conversations"
  on public.conversations for select
  using (public.is_operator());

create policy "operators can update conversations"
  on public.conversations for update
  using (public.is_operator())
  with check (public.is_operator());

-- 顧客にはconversationsのUPDATE/DELETEポリシーを設けない（RLSはデフォルト拒否のため自動的に禁止される）。
-- AIバックエンドによるstatus/category/escalated_reasonの更新やAIメッセージの保存は、
-- 顧客のRLS権限では行えないため、src/lib/supabase/admin.ts（service role）を用いてサーバー側から実行する。

-- messages
create policy "customers can view own conversation messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.customer_user_id = auth.uid()
    )
  );

create policy "customers can send own messages"
  on public.messages for insert
  with check (
    sender_type = 'customer'
    and sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.customer_user_id = auth.uid()
    )
  );

create policy "operators can view all messages"
  on public.messages for select
  using (public.is_operator());

create policy "operators can send operator messages"
  on public.messages for insert
  with check (
    sender_type = 'operator'
    and sender_id = auth.uid()
    and public.is_operator()
  );

-- messagesは原則追記のみ（DATABASE.md §7）: update/deleteポリシーを意図的に作成しない
-- （ポリシーがない操作はRLSのデフォルト拒否により自動的に禁止される）。

-- faqs: 顧客の直接参照は原則禁止し、サーバー処理（service role）経由でのみアクセスする（SECURITY.md §4）。
-- anon/authenticatedロール向けのポリシーは意図的に作成しない。

-- business_holidays: 顧客・オペレーターいずれの直接アクセスも想定しない。
-- 営業時間判定はサーバー側（service role）でholiday一覧を取得して行う。ポリシーは意図的に作成しない。
