-- Invite role: admin invites pass app_role in raw_user_meta_data (see /api/admin/users).
-- Run after migrate-profiles-roles-report-creator.sql if you already applied the older trigger.

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

notify pgrst, 'reload schema';
