-- Optional: run only if you still have `invoices` and do not yet have `reports`.

do $$
begin
  if to_regclass('public.invoices') is not null and to_regclass('public.reports') is null then
    alter table public.invoices rename to reports;
  end if;
end $$;
