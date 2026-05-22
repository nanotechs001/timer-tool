-- Stores one previous-state snapshot per report per UTC day.

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  snapshot_day date not null default ((now() at time zone 'utc')::date),
  title text not null,
  client_id uuid references public.clients (id) on delete set null,
  line_items jsonb not null default '[]'::jsonb,
  notes text not null default '',
  issue_date text not null default '',
  due_date text not null default '',
  bill_from_name text not null default '',
  bill_from_email text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists report_snapshots_report_day_uidx
  on public.report_snapshots (report_id, snapshot_day);

create index if not exists report_snapshots_report_created_idx
  on public.report_snapshots (report_id, created_at desc);
