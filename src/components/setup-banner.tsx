import { isAppConfigured } from "@/lib/config";

export function SetupBanner() {
  if (isAppConfigured()) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      Add{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        NEXT_PUBLIC_SUPABASE_URL
      </code>
      ,{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        NEXT_PUBLIC_SUPABASE_ANON_KEY
      </code>{" "}
      (or{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      </code>
      ), and a server secret (
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        SUPABASE_SECRET_KEY
      </code>{" "}
      or legacy{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        SUPABASE_SERVICE_ROLE_KEY
      </code>
      ) to{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        .env.local
      </code>
      . In Supabase: Authentication → add admin users with email/password. Run{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
        supabase/schema.sql
      </code>{" "}
      in the SQL editor.
    </div>
  );
}
