import type { ReactNode } from "react";

/** Shared backdrop for auth surfaces (/login and logged-out home). */
export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(0,71,255,0.11),transparent_55%)] dark:bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(0,71,255,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-brand/[0.04] to-transparent dark:from-brand/[0.06]"
        aria-hidden
      />
      {children}
    </div>
  );
}
