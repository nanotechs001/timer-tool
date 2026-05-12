-- Run in Supabase SQL Editor if clients table already exists without ClickUp link columns.

alter table public.clients
  add column if not exists clickup_team_id text not null default '';

alter table public.clients
  add column if not exists clickup_space_id text not null default '';

alter table public.clients
  add column if not exists clickup_folder_id text not null default '';

alter table public.clients
  add column if not exists clickup_list_id text not null default '';

-- Ask PostgREST to refresh its schema cache (helps clear “schema cache” errors in the API).
notify pgrst, 'reload schema';
