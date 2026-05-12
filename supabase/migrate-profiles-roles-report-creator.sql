-- Profiles (role), report creator attribution, auth trigger.
-- Run in Supabase SQL Editor after main schema.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- App uses service role for DB; no anon policies needed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'app_role', '');
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when r = 'admin' then 'admin' else 'member' end,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.reports
  add column if not exists created_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists created_by_label text not null default '';

-- Existing users: make them admins so behavior stays the same until you assign roles.
insert into public.profiles (id, role, full_name)
select id, 'admin', coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do update set
  role = excluded.role,
  full_name = case
    when excluded.full_name <> '' then excluded.full_name
    else public.profiles.full_name
  end;

notify pgrst, 'reload schema';
