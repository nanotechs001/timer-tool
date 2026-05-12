"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("error") === "auth_config") {
      setError(
        "Server auth is not configured. Add NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY) to .env.local, then restart the dev server."
      );
      return;
    }
    if (sp.get("error") === "auth") {
      setError(
        "That sign-in link is invalid or expired. Ask an admin to send a new invite, and open the link on the same site where it was sent (production vs localhost)."
      );
      return;
    }
    const err = sp.get("error");
    if (err && err !== "auth_config" && err !== "auth") {
      try {
        setError(decodeURIComponent(err));
      } catch {
        setError(err);
      }
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) {
        throw new Error("App is missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key.");
      }
      const supabase = createBrowserClient(url, key);
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) throw new Error(signErr.message);
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get("next");
      const safe =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.startsWith("/api/");
      router.push(safe ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 justify-center sm:justify-start">
          <BrandLogo priority />
        </div>
        <ThemeToggle />
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-surface"
      >
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">Admin sign in</p>
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
