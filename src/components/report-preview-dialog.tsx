"use client";

import { useEffect, useState } from "react";
import type { Client, Report } from "@/lib/types";
import { toAbsoluteShareUrl } from "@/lib/public-report-url";
import { PublicReportView } from "@/components/public-report-view";

type Props = {
  report: Report | null;
  client: Client | null;
  shareBase: string;
  onClose: () => void;
  onEditSummary: () => void;
};

export function ReportPreviewDialog({
  report,
  client,
  shareBase,
  onClose,
  onEditSummary,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!report) setCopied(false);
  }, [report]);

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

  const base = shareBase.replace(/\/$/, "");
  const shareDisplay = base ? `${base}/r/${report.slug}` : `/r/${report.slug}`;
  const publicUrl = toAbsoluteShareUrl(shareDisplay);

  function viewPublic() {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function editSummary() {
    onEditSummary();
    onClose();
  }

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
        <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2
              id="report-preview-title"
              className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Preview — {report.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={viewPublic}
                className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
              >
                View public page
              </button>
              <button
                type="button"
                onClick={() => void copyUrl()}
                className="cursor-pointer rounded-lg border border-brand/40 bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft dark:border-brand-on-dark/40 dark:bg-surface dark:text-brand-on-dark dark:hover:bg-brand/10"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <button
                type="button"
                onClick={editSummary}
                className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Edit summary
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 self-end rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:self-start dark:text-zinc-300 dark:hover:bg-zinc-800"
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
