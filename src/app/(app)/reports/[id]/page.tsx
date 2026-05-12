import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/config";
import { getReport, listClients } from "@/lib/ledger";
import { getViewerIsAdmin } from "@/lib/viewer";
import { ReportForm } from "@/components/report-form";
import { resolveShareBase } from "@/lib/share-base";

type Props = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();

export default async function EditReportPage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        Configure Supabase to edit summaries.
      </div>
    );
  }

  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const [report, clients, shareBase] = await Promise.all([
    getReport(id),
    listClients().catch(() => []),
    resolveShareBase(),
  ]);

  if (!report) notFound();

  const canDelete = await getViewerIsAdmin();

  const shareUrl = `${shareBase.replace(/\/$/, "")}/r/${report.slug}`;

  return (
    <div>
      <div className="border-b border-zinc-100 bg-white px-4 py-6 dark:border-zinc-900 dark:bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit summary</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Public link:{" "}
              <span className="font-mono text-xs text-brand dark:text-brand-on-dark">
                {shareUrl}
              </span>
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              href={`/r/${report.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-200 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Open public page
            </Link>
            <a
              href={`/api/pdf/${encodeURIComponent(report.slug)}`}
              className="rounded-xl bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800"
            >
              PDF
            </a>
          </div>
        </div>
      </div>
      <ReportForm clients={clients} mode="edit" initial={report} canDelete={canDelete} />
    </div>
  );
}
