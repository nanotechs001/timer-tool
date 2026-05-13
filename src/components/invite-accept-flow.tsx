"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { InlineSpinner } from "@/components/inline-spinner";

type Phase =
  | "idle"
  | "verifying"
  | "need_password"
  | "saving_password"
  | "error";

const PASSWORD_MIN = 8;

function createSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

function stripQueryKeys(keys: string[]) {
  const u = new URL(window.location.href);
  for (const k of keys) u.searchParams.delete(k);
  const q = u.searchParams.toString();
  window.history.replaceState(null, "", u.pathname + (q ? `?${q}` : ""));
}

function stripUrlHash() {
  const path = window.location.pathname + (window.location.search || "");
  window.history.replaceState(null, "", path);
}

/**
 * Email invite / magic link: Supabase often sends `?token_hash=…&type=invite` (verifyOtp),
 * or `#access_token=…&type=invite` (implicit). The SSR browser client defaults to PKCE and
 * rejects implicit hash URLs, so we parse the fragment and call `setSession` ourselves.
 * PKCE `?code=` is handled by `src/app/page.tsx`.
 */
export function InviteAcceptFlow() {
  const router = useRouter();
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (started.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get("token_hash");
    const typeRaw = params.get("type");
    const type = typeRaw?.toLowerCase() ?? null;

    if (token_hash && type) {
      started.current = true;
      void runQueryOtp(token_hash, type);
      return;
    }

    const rawHash = window.location.hash.slice(1);
    if (!rawHash) return;

    const hp = new URLSearchParams(rawHash);
    const hasImplicitTokens =
      hp.has("access_token") && hp.has("refresh_token");
    const hasHashOtp = hp.get("token_hash") && hp.get("type");

    if (!hasImplicitTokens && !hasHashOtp && !hp.get("error")) return;

    started.current = true;
    void runHashAuth(hp);
  }, [router]);

  async function runQueryOtp(token_hash: string, type: string) {
    const supabase = createSb();
    if (!supabase) return;

    setPhase("verifying");
    setError(null);

    const { error: vErr } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "signup" | "recovery" | "magiclink" | "email_change",
    });

    stripQueryKeys(["token_hash", "type"]);

    if (vErr) {
      setPhase("error");
      setError(vErr.message);
      return;
    }

    const needsPassword =
      type === "invite" || type === "recovery" || type === "signup";
    if (needsPassword) {
      setPhase("need_password");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function runHashAuth(hp: URLSearchParams) {
    const supabase = createSb();
    if (!supabase) return;

    setPhase("verifying");
    setError(null);

    const hashType = (hp.get("type") ?? "").toLowerCase();

    const errParam = hp.get("error_description") || hp.get("error");
    if (errParam) {
      stripUrlHash();
      setPhase("error");
      try {
        setError(decodeURIComponent(errParam.replace(/\+/g, " ")));
      } catch {
        setError(errParam);
      }
      return;
    }

    const th = hp.get("token_hash");
    const thType = hp.get("type")?.toLowerCase();
    if (th && thType) {
      const { error: vErr } = await supabase.auth.verifyOtp({
        token_hash: th,
        type: thType as "invite" | "signup" | "recovery" | "magiclink" | "email_change",
      });
      stripUrlHash();
      if (vErr) {
        setPhase("error");
        setError(vErr.message);
        return;
      }
      const needsPassword =
        thType === "invite" || thType === "recovery" || thType === "signup";
      if (needsPassword) {
        setPhase("need_password");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    const access_token = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");
    if (!access_token || !refresh_token) {
      stripUrlHash();
      setPhase("error");
      setError(
        "This invite link is missing tokens (it may be expired or already used). Ask for a new invite."
      );
      return;
    }

    const { data, error: sErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    stripUrlHash();

    if (sErr || !data.session) {
      setPhase("error");
      setError(
        sErr?.message ??
          "Could not complete sign-in from this link. Try opening it again or ask for a new invite."
      );
      return;
    }

    const needsPassword =
      hashType === "invite" || hashType === "signup" || hashType === "recovery";
    if (needsPassword) {
      setPhase("need_password");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function onSetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createSb();
    if (!supabase) return;

    setPhase("saving_password");
    const { error: uErr } = await supabase.auth.updateUser({ password });
    if (uErr) {
      setPhase("need_password");
      setError(uErr.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  if (phase === "idle") return null;

  if (phase === "verifying") {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 p-6 backdrop-blur-sm dark:bg-zinc-950/90"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-10 py-10 dark:border-zinc-800 dark:bg-surface">
          <InlineSpinner className="scale-150" label="Confirming your invite…" />
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mb-6 w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
        <p className="font-medium">Invite link</p>
        <p className="mt-1 text-xs">{error ?? "Something went wrong."}</p>
        <p className="mt-2 text-xs text-red-800/90 dark:text-red-200/90">
          You can close this tab and use the <strong className="font-medium">sign-in form</strong> if you
          already set a password.
        </p>
      </div>
    );
  }

  if (phase === "need_password" || phase === "saving_password") {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm dark:bg-zinc-950/95"
        role="dialog"
        aria-labelledby="invite-password-title"
      >
        <form
          onSubmit={(e) => void onSetPassword(e)}
          className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-surface"
        >
          <p
            id="invite-password-title"
            className="text-center text-xs font-medium uppercase tracking-wide text-brand dark:text-brand-on-dark"
          >
            Accept invite
          </p>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Set your password below. You&apos;ll be signed in and taken to the dashboard automatically.
          </p>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Set password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={phase === "saving_password"}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {phase === "saving_password" ? "Saving…" : "Save password and continue"}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
