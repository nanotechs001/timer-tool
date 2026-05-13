import { BrandLogo } from "@/components/brand-logo";
import { InviteAcceptFlow } from "@/components/invite-accept-flow";
import { LoginForm } from "@/components/login-form";
import { LoginShell } from "@/components/login-shell";
import { ThemeToggle } from "@/components/theme-toggle";

const cardSurface =
  "w-full max-w-[420px] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-black/40 dark:ring-white/[0.04]";

export function LoggedOutHome() {
  return (
    <>
      <InviteAcceptFlow />
      <LoginShell>
        <article className={cardSurface}>
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 bg-zinc-50/80 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-800/40">
            <BrandLogo priority />
            <ThemeToggle />
          </div>
          <div className="border-b border-zinc-100 px-6 py-8 text-center dark:border-zinc-800">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.65rem] sm:leading-snug dark:text-white">
              Our internal work log &amp; summaries
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Track what we shipped, reconcile time, and keep reporting consistent across the org. If you
              reached this URL by mistake, please close the tab—there is nothing to sign up for here.
            </p>
          </div>
          <div className="px-6 pb-8 pt-6 sm:px-8">
            <LoginForm variant="embedded" />
          </div>
        </article>
      </LoginShell>
    </>
  );
}
