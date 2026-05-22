import Link from "next/link";
import { isDatabaseConfigured, publicAppUrl } from "@/lib/config";
import { listClients, listReports } from "@/lib/ledger";
import { getViewerIsAdmin } from "@/lib/viewer";
import { WorkSummariesTable } from "@/components/work-summaries-table";

type Props = { searchParams: Promise<{ client?: string | string[] }> };

export default async function DashboardPage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        Configure Supabase database keys to load summaries.
      </div>
    );
  }

  let reports: Awaited<ReturnType<typeof listReports>> = [];
  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let err: string | null = null;
  try {
    [reports, clients] = await Promise.all([listReports(), listClients()]);
  } catch (e) {
    err = e instanceof Error ? e.message : "Unknown error";
  }

  const base = publicAppUrl();
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const rows = reports.map((rep) => ({
    report: rep,
    client: rep.clientId ? (clientById.get(rep.clientId) ?? null) : null,
  }));

  const isAdmin = await getViewerIsAdmin();
  const sp = await searchParams;
  const initialClientKeyRaw = Array.isArray(sp.client) ? sp.client[0] : sp.client;
  const initialClientKey =
    typeof initialClientKeyRaw === "string" && initialClientKeyRaw.trim()
      ? initialClientKeyRaw.trim()
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Work summaries
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tasks, hours, and shareable links — not billing.
          </p>
        </div>
        <Link
          href="/reports/new"
          className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-sm hover:bg-brand-hover"
        >
          New summary
        </Link>
      </div>

      {err ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </p>
      ) : (
        <WorkSummariesTable
          rows={rows}
          shareBase={base}
          isAdmin={isAdmin}
          initialClientKey={initialClientKey}
        />
      )}
    </div>
  );
}
