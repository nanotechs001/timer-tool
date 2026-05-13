"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  reportTitle: string;
  /** Full URL to the public /r/[slug] page */
  publicUrl: string;
  onClose: () => void;
};

function CheckIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareLinkCreatedDialog({
  open,
  reportTitle,
  publicUrl,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function viewPublic() {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-created-title"
        className="relative z-[106] w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-surface"
      >
        <div className="flex gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            aria-hidden
          >
            <CheckIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="share-created-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Share link created
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{reportTitle}</span> is
              live. Anyone with the link can open the public summary.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Public URL
          </p>
          <p className="mt-1 break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
            {publicUrl}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={viewPublic}
            className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover sm:min-w-[10rem]"
          >
            View public page
          </button>
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="cursor-pointer rounded-xl border border-brand/40 bg-white px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand-soft dark:border-brand-on-dark/40 dark:bg-surface dark:text-brand-on-dark dark:hover:bg-brand/10"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Edit summary
          </button>
        </div>
      </div>
    </div>
  );
}
