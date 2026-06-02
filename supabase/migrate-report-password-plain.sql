alter table public.reports
add column if not exists report_password_plain text;
