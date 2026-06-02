"use client";

import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InlineSpinner } from "@/components/inline-spinner";

type Props = {
  userEmail: string;
  isAdmin?: boolean;
};

export function UserAccountMenu({ userEmail, isAdmin = false }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    try {
      if (url && key) {
        const supabase = createBrowserClient(url, key);
        await supabase.auth.signOut();
      }
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {signingOut ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-50/95 p-6 backdrop-blur-sm dark:bg-zinc-950/95"
          role="status"
          aria-live="polite"
          aria-label="Signing out"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white px-10 py-10 text-center shadow-xl dark:border-zinc-700 dark:bg-surface">
            <InlineSpinner className="scale-[1.6]" />
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Signing out…</p>
          </div>
        </div>
      ) : null}
      <div className="group relative inline-block text-left">
        <button
          type="button"
          className="flex max-w-[14rem] cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
          aria-haspopup="true"
          aria-expanded={undefined}
        >
          <span className="truncate">{userEmail}</span>
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
        </button>

        <div
          className="pointer-events-none invisible absolute right-0 top-full z-[60] min-w-[12rem] pt-0.5 opacity-0 transition-[opacity,visibility] duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100"
          role="menu"
        >
          <div className="rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {isAdmin ? (
              <Link
                href="/settings/team"
                role="menuitem"
                className="block cursor-pointer px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Team
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              className="w-full cursor-pointer px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => void signOut()}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
