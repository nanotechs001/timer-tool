import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/config";
import { getReport, getReportPasswordPlainById, listClients } from "@/lib/ledger";
import { getViewerIsAdmin } from "@/lib/viewer";
import { ReportForm } from "@/components/report-form";
import { resolveShareBase } from "@/lib/share-base";
import { PublicLinkRow } from "@/components/public-link-row";
import { EditSummaryHeaderActions } from "@/components/edit-summary-header-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[]; view?: string | string[] }>;
};

const uuid = z.string().uuid();

export default async function EditReportPage({ params, searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        Configure Supabase to edit summaries.
      </div>
    );
  }

  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();

  const [report, clients, shareBase, initialAccessPassword] = await Promise.all([
    getReport(id),
    listClients().catch(() => []),
    resolveShareBase(),
    getReportPasswordPlainById(id).catch(() => null),
  ]);

  if (!report) notFound();

  const canDelete = await getViewerIsAdmin();

  const shareUrl = `${shareBase.replace(/\/$/, "")}/r/${report.slug}`;
  const returnToRaw = Array.isArray(sp.returnTo) ? sp.returnTo[0] : sp.returnTo;
  const returnTo =
    typeof returnToRaw === "string" &&
    returnToRaw.startsWith("/") &&
    !returnToRaw.startsWith("//")
      ? returnToRaw
      : "/dashboard";
  const viewPreviousHref = `/reports/${report.id}?returnTo=${encodeURIComponent(returnTo)}&view=previous`;

  return (
    <div>
      <div className="border-b border-zinc-100 bg-white px-4 py-6 dark:border-zinc-900 dark:bg-surface">
        <div className="mx-auto max-w-3xl">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={returnTo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              <EditSummaryHeaderActions
                pdfUrl={`/api/pdf/${encodeURIComponent(report.slug)}`}
                viewPreviousHref={viewPreviousHref}
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Edit summary</h1>
            <PublicLinkRow publicUrl={shareUrl} />
          </div>
        </div>
      </div>
      <ReportForm
        clients={clients}
        mode="edit"
        initial={report}
        initialAccessPassword={initialAccessPassword}
        canDelete={canDelete}
      />
    </div>
  );
}
