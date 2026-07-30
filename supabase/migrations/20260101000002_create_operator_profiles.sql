-- DATABASE.md §5 operator_profiles
-- D-010: 初期オペレーター2名はSupabase Auth + operator_profilesへ管理者が手動登録する
create table public.operator_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('operator', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
