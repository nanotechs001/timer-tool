"use client";

import { useState } from "react";

type Props = {
  publicUrl: string;
  secondaryLabel?: string;
};

export function PublicLinkRow({ publicUrl, secondaryLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span>Public link:</span>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all font-mono text-xs text-brand hover:underline dark:text-brand-on-dark"
        >
          {publicUrl}
          <svg
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 5h6m0 0v6m0-6-9 9M5 11v8h8"
            />
          </svg>
        </a>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-surface dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      {secondaryLabel ? (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-100/80 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 1v5h5M9 14h6M9 18h4"
            />
          </svg>
          {secondaryLabel}
        </span>
      ) : null}
    </div>
  );
}
