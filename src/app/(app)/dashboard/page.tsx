import Link from "next/link";
import { isDatabaseConfigured, publicAppUrl } from "@/lib/config";
import { listReports } from "@/lib/ledger";
import { totalHours } from "@/lib/types";
import { formatHours } from "@/lib/format";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        Configure Supabase database keys to load summaries.
      </div>
    );
  }

  let reports: Awaited<ReturnType<typeof listReports>> = [];
  let err: string | null = null;
  try {
    reports = await listReports();
  } catch (e) {
    err = e instanceof Error ? e.message : "Unknown error";
  }

  const base = publicAppUrl();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
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
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          New summary
        </Link>
      </div>

      {err ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Share</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => {
                const shareDisplay = base
                  ? `${base}/r/${rep.slug}`
                  : `/r/${rep.slug}`;
                const hrs = totalHours(rep.lineItems);
                return (
                  <tr
                    key={rep.id}
                    className="border-b border-zinc-50 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {rep.title}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-600">
                      {formatHours(hrs)} hrs
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {shareDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/reports/${rep.id}`}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reports.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No summaries yet. Create one to get a share link.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
