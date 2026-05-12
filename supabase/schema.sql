-- Run in Supabase SQL Editor once per project.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  company text not null default '',
  notes text not null default '',
  clickup_team_id text not null default '',
  clickup_space_id text not null default '',
  clickup_folder_id text not null default '',
  clickup_list_id text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client_id uuid references public.clients (id) on delete set null,
  line_items jsonb not null default '[]'::jsonb,
  currency text not null default 'USD',
  notes text not null default '',
  issue_date text not null default '',
  due_date text not null default '',
  bill_from_name text not null default '',
  bill_from_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_slug_idx on public.reports (slug);
create index if not exists reports_client_id_idx on public.reports (client_id);

-- ClickUp OAuth (one row per Supabase user; server-only access via service role)
create table if not exists public.clickup_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.clickup_connections enable row level security;
