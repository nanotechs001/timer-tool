import Link from "next/link";
import { isAppConfigured } from "@/lib/config";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAccountMenu } from "@/components/user-account-menu";

const baseLinks = [{ href: "/clients", label: "Clients" }];

type Props = {
  userEmail?: string | null;
  isAdmin?: boolean;
};

export function AppNav({ userEmail, isAdmin = false }: Props) {
  const links = isAdmin
    ? [...baseLinks, { href: "/settings/integrations", label: "Integrations" }]
    : baseLinks;
  const ready = isAppConfigured();
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-background/88">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
        <Link
          href="/dashboard"
          className="flex shrink-0 cursor-pointer items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <BrandLogo priority />
        </Link>
        <nav className="order-3 flex w-full flex-wrap items-center gap-1 text-sm sm:order-none sm:flex-1 sm:w-auto">
          <div className="group relative">
            <Link
              href="/dashboard"
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              Summary
              <svg
                className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
            <div className="pointer-events-none invisible absolute left-0 top-full z-[60] min-w-[11rem] pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
              <div className="rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <Link
                  href="/dashboard"
                  className="block cursor-pointer px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  View All
                </Link>
                <Link
                  href="/reports/new"
                  className="block cursor-pointer px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Add New
                </Link>
              </div>
            </div>
          </div>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className={`hidden text-xs font-medium sm:inline ${
              ready ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {ready ? "Ready" : "Config"}
          </span>
          {userEmail ? (
            <UserAccountMenu userEmail={userEmail} isAdmin={isAdmin} />
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
