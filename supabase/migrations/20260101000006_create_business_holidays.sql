-- DATABASE.md §6 business_holidays
-- 曜日判定（平日10:00〜18:00、土日休業）はアプリ側で行い、祝日・特別休業日のみ本テーブルで管理する
create table public.business_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  holiday_name text not null,
  created_at timestamptz not null default now()
);
