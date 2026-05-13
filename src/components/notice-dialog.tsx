"use client";

import { useEffect } from "react";

const panelClass =
  "relative z-[101] w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-surface";

type Props = {
  open: boolean;
  title: string;
  description: string;
  okLabel?: string;
  /** `danger` uses the same red accent as delete confirmations */
  variant?: "info" | "danger";
  onOk: () => void;
};

function InfoIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 1.14h12.74a2 2 0 0 0 1.71-1.14l-8.47-14.14a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NoticeDialog({
  open,
  title,
  description,
  okLabel = "OK",
  variant = "info",
  onOk,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onOk}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-dialog-title"
        className={panelClass}
      >
        <div className="flex gap-4">
          <div
            className={
              variant === "danger"
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/55 dark:text-red-300"
                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand/20 dark:text-brand-on-dark"
            }
            aria-hidden
          >
            {variant === "danger" ? (
              <WarningIcon className="h-6 w-6" />
            ) : (
              <InfoIcon className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="notice-dialog-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onOk}
            className={
              variant === "danger"
                ? "cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                : "cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            }
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
