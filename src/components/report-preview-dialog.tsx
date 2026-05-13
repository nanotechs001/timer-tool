"use client";

import { useEffect, useState } from "react";
import type { Client, Report } from "@/lib/types";
import { toAbsoluteShareUrl } from "@/lib/public-report-url";
import { PublicReportView } from "@/components/public-report-view";

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const toolbarActionClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm font-medium text-zinc-600 underline-offset-4 transition hover:bg-zinc-100 hover:text-zinc-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-900";

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
        <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="report-preview-title"
              className="min-w-0 truncate pr-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Preview — {report.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              Close
            </button>
          </div>
          <nav
            className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80"
            aria-label="Public summary actions"
          >
            <button type="button" onClick={viewPublic} className={toolbarActionClass}>
              <IconExternalLink className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-500" />
              <span>View public page</span>
            </button>
            <button type="button" onClick={() => void copyUrl()} className={toolbarActionClass}>
              {copied ? (
                <IconCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <IconLink className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-500" />
              )}
              <span className={copied ? "text-emerald-700 dark:text-emerald-400" : undefined}>
                {copied ? "Copied" : "Copy shareable link"}
              </span>
            </button>
            <button type="button" onClick={editSummary} className={toolbarActionClass}>
              <IconPencil className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-500" />
              <span>Edit summary</span>
            </button>
          </nav>
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
