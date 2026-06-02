"use client";

import { useCallback } from "react";
import type { Client, Report } from "@/lib/types";
import {
  lineHoursProgressRatio,
  lineHoursWorked,
  totalPlannedHours,
  totalWorkedHours,
} from "@/lib/types";
import { formatHours, formatReportPeriodLine, formatSummaryUpdatedAt } from "@/lib/format";
import { BrandLogo } from "@/components/brand-logo";

type Props = {
  report: Report;
  client: Client | null;
  shareBase: string;
  /** Inline preview in app modal — hides print/share toolbar. */
  variant?: "public" | "preview";
};

export function PublicReportView({
  report,
  client,
  shareBase,
  variant = "public",
}: Props) {
  const workedTotal = totalWorkedHours(report.lineItems);
  const plannedTotal = totalPlannedHours(report.lineItems);
  const lastUpdatedIso = report.updatedAt?.trim() || report.createdAt;
  const shareUrl = `${shareBase.replace(/\/$/, "")}/r/${report.slug}`;
  const pdfUrl = `/api/pdf/${encodeURIComponent(report.slug)}`;
  const isPreview = variant === "preview";
  const periodLine = formatReportPeriodLine(report.issueDate, report.dueDate);

  const print = useCallback(() => {
    window.print();
  }, []);

  return (
    <div
      className={
        isPreview
          ? "report-print min-h-0 bg-transparent py-0 text-zinc-900 dark:text-zinc-100"
          : "report-print min-h-screen bg-zinc-100 py-10 text-zinc-900 print:bg-white print:py-0 dark:bg-background"
      }
    >
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        {!isPreview ? (
          <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={print}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Print
            </button>
            <a
              href={pdfUrl}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Download PDF
            </a>
            <span className="w-full text-xs text-zinc-500 sm:w-auto sm:self-center dark:text-zinc-400">
              Share:{" "}
              <span className="select-all font-mono text-zinc-700 dark:text-zinc-300">{shareUrl}</span>
            </span>
          </div>
        ) : null}

        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-brand-soft to-white px-8 py-10 print:from-white dark:border-zinc-800 dark:from-brand/15 dark:to-zinc-900">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <BrandLogo className="h-7 shrink-0 sm:h-8 print:block" priority={!isPreview} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand dark:text-brand-on-dark">
                    Work summary
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight">{report.title}</h1>
                </div>
              </div>
              <div className="shrink-0 space-y-1.5 text-left text-sm sm:max-w-[min(100%,20rem)] sm:text-right">
                <div className="space-y-1.5 border-t border-zinc-200 pt-1 sm:border-t-0 sm:pt-0 dark:border-zinc-700">
                  {periodLine ? (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Period:</span>{" "}
                      {periodLine}
                    </p>
                  ) : null}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Last updated {formatSummaryUpdatedAt(lastUpdatedIso)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 border-t border-zinc-100 px-8 py-8 sm:grid-cols-2 dark:border-zinc-800 dark:text-zinc-100">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Prepared by
              </h2>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{report.billFromName || "—"}</p>
              {report.billFromEmail ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{report.billFromEmail}</p>
              ) : null}
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Client
              </h2>
              {client ? (
                <>
                  <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{client.name}</p>
                  {client.company ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{client.company}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">No client</p>
              )}
            </div>
          </div>

          <div className="px-8 pb-8 pt-0 dark:text-zinc-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-700">
                  <th className="py-2 pr-4 font-medium">Task</th>
                  <th className="min-w-[12rem] py-2 pr-4 font-medium">Progress</th>
                  <th className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {report.lineItems.map((row) => {
                  const pct = lineHoursProgressRatio(row);
                  const worked = lineHoursWorked(row);
                  return (
                    <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-3 pr-4 align-top">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.task}</span>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="flex max-w-[16rem] flex-col gap-2">
                          <p className="text-right text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                            {formatHours(worked)} / {formatHours(row.hours)} hrs
                          </p>
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 print:bg-zinc-200 dark:bg-zinc-700"
                            role="progressbar"
                            aria-valuenow={Math.round(pct)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${formatHours(worked)} of ${formatHours(row.hours)} hours`}
                          >
                            <div
                              className="h-full rounded-full bg-brand print:bg-[#1433be] dark:bg-brand-on-dark"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 align-top text-xs text-zinc-600 dark:text-zinc-400">
                        {row.notes ? (
                          <span className="whitespace-pre-wrap">{row.notes}</span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Total time</p>
                <p className="text-2xl font-semibold tabular-nums text-brand dark:text-brand-on-dark">
                  {formatHours(workedTotal)} / {formatHours(plannedTotal)} hrs
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Worked / pre-allocated
                </p>
              </div>
            </div>

            {report.notes ? (
              <div className="mt-8 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                <p className="text-xs font-semibold uppercase text-zinc-400">Overview</p>
                <p className="mt-2 whitespace-pre-wrap">{report.notes}</p>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
