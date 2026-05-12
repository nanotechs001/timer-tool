"use client";

import { useCallback } from "react";
import type { Client, Report } from "@/lib/types";
import { totalHours } from "@/lib/types";
import { formatHours } from "@/lib/format";

type Props = {
  report: Report;
  client: Client | null;
  shareBase: string;
};

export function PublicReportView({ report, client, shareBase }: Props) {
  const hours = totalHours(report.lineItems);
  const shareUrl = `${shareBase.replace(/\/$/, "")}/r/${report.slug}`;
  const pdfUrl = `/api/pdf/${encodeURIComponent(report.slug)}`;

  const print = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="report-print min-h-screen bg-zinc-100 py-10 text-zinc-900 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:max-w-none print:px-0">
        <div className="mb-6 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={print}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Print
          </button>
          <a
            href={pdfUrl}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Download PDF
          </a>
          <span className="self-center text-xs text-zinc-500">
            Share:{" "}
            <span className="select-all font-mono text-zinc-700">{shareUrl}</span>
          </span>
        </div>

        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-indigo-50 to-white px-8 py-10 print:from-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Work summary
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{report.title}</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {report.issueDate ? report.issueDate : null}
              {report.issueDate && report.dueDate ? " · " : null}
              {report.dueDate ? report.dueDate : null}
            </p>
          </div>

          <div className="grid gap-8 px-8 py-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Prepared by
              </h2>
              <p className="mt-1 font-medium">{report.billFromName || "—"}</p>
              {report.billFromEmail ? (
                <p className="text-sm text-zinc-500">{report.billFromEmail}</p>
              ) : null}
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Client
              </h2>
              {client ? (
                <>
                  <p className="mt-1 font-medium">{client.name}</p>
                  {client.company ? (
                    <p className="text-sm text-zinc-500">{client.company}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">No client</p>
              )}
            </div>
          </div>

          <div className="px-8 pb-8">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Task</th>
                  <th className="py-2 pr-4 text-right font-medium">Hours</th>
                  <th className="py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {report.lineItems.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-zinc-900">{row.task}</span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-600">
                      {formatHours(row.hours)}
                    </td>
                    <td className="py-3">
                      {row.resourceUrl ? (
                        <a
                          href={row.resourceUrl}
                          className="text-xs text-indigo-600 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Link
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 flex justify-end border-t border-zinc-200 pt-4">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Total time</p>
                <p className="text-2xl font-semibold tabular-nums">{formatHours(hours)} hrs</p>
              </div>
            </div>

            {report.notes ? (
              <div className="mt-8 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="text-xs font-semibold uppercase text-zinc-400">Notes</p>
                <p className="mt-2 whitespace-pre-wrap">{report.notes}</p>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
