-- Optional per-report password for public share links.

alter table public.reports
  add column if not exists report_password_hash text;
