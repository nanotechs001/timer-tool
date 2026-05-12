"use client";

import { useEffect } from "react";
import type { Client, Report } from "@/lib/types";
import { PublicReportView } from "@/components/public-report-view";

type Props = {
  report: Report | null;
  client: Client | null;
  shareBase: string;
  onClose: () => void;
};

export function ReportPreviewDialog({ report, client, shareBase, onClose }: Props) {
  useEffect(() => {
    if (!report) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [report, onClose]);

  useEffect(() => {
    if (!report) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [report]);

  if (!report) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,56rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-zinc-100 shadow-2xl dark:border-zinc-700 dark:bg-surface sm:max-h-[min(88vh,900px)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h2
            id="report-preview-title"
            className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Preview — {report.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
          <PublicReportView
            report={report}
            client={client}
            shareBase={shareBase}
            variant="preview"
          />
        </div>
      </div>
    </div>
  );
}
