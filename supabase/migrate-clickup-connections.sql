-- Additive migration: ClickUp OAuth token storage (run in Supabase SQL editor if upgrading an existing DB).

create table if not exists public.clickup_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.clickup_connections enable row level security;
