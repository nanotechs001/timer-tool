"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { InlineSpinner } from "@/components/inline-spinner";
import { ThemeToggle } from "@/components/theme-toggle";

type LoginFormProps = {
  /**
   * `standalone` — full card with header (logo + theme) for /login.
   * `embedded` — fields + button only; parent supplies the card shell.
   */
  variant?: "standalone" | "embedded";
};

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-[15px] text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-brand-on-dark dark:focus:ring-brand-on-dark/25";

export function LoginForm({ variant = "standalone" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

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
        "That sign-in link did not include a valid session code (often expired, already used, or opened on a different URL than the invite). Fix: In Supabase → Authentication → Redirect URLs, allow your exact site root (e.g. https://your-app.com/) and redeploy with NEXT_PUBLIC_APP_URL set to that origin. Then ask an admin to send a new invite."
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
    setNotice(null);
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
      setLoginSuccess(true);
      router.push(safe ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }
    setResetBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not send password reset email");
      }
      setNotice("Password reset link sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send password reset email");
    } finally {
      setResetBusy(false);
    }
  }

  const fields = (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200/80 bg-red-50 px-3.5 py-3 text-sm leading-snug text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-3.5 py-3 text-sm leading-snug text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100"
        >
          {notice}
        </div>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <button
            type="button"
            onClick={() => void onForgotPassword()}
            disabled={resetBusy}
            className="text-xs font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-brand-on-dark"
          >
            {resetBusy ? "Sending..." : "Forgot password?"}
          </button>
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </>
  );

  return (
    <>
      {loginSuccess ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50/95 p-6 backdrop-blur-sm dark:bg-zinc-950/95"
          role="status"
          aria-live="polite"
          aria-label="Signed in, loading app"
        >
          <div className="flex max-w-sm flex-col items-center gap-5 rounded-2xl border border-zinc-200/80 bg-white px-10 py-12 text-center shadow-xl dark:border-zinc-700 dark:bg-surface">
            <InlineSpinner className="scale-[1.75]" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Signed in</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Opening your workspace…</p>
            </div>
          </div>
        </div>
      ) : null}

      {variant === "embedded" ? (
        <form onSubmit={onSubmit} className="w-full space-y-5">
          {fields}
        </form>
      ) : (
        <div className="w-full max-w-[420px]">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-black/40 dark:ring-white/[0.04]">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 bg-zinc-50/80 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-800/40">
              <BrandLogo priority />
              <ThemeToggle />
            </div>
            <div className="px-6 pb-8 pt-6 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                Team sign in
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Use your workspace credentials.</p>
              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                {fields}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
