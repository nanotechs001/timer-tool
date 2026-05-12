"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Props = {
  oauthConfigured: boolean;
  callbackUrl: string;
  notice?: string;
  initialConnected: boolean;
  clickupTableReady: boolean;
};

export function IntegrationsClickUpPanel({
  oauthConfigured,
  callbackUrl,
  notice,
  initialConnected,
  clickupTableReady,
}: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [busy, setBusy] = useState(false);
  const [pkToken, setPkToken] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  async function executeDisconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/clickup/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Disconnect failed");
      setConnected(false);
      setPkToken("");
      setDisconnectOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function savePersonalToken() {
    setInlineError(null);
    const trimmed = pkToken.trim();
    if (!trimmed) {
      setInlineError("Paste your token first.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/clickup/personal-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInlineError(
          typeof data.error === "string" ? data.error : "Could not save token"
        );
        return;
      }
      setPkToken("");
      setConnected(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const noticeText =
    notice === "connected"
      ? "ClickUp connected successfully."
      : notice === "bad_state"
        ? "OAuth session expired. Click “Connect with ClickUp” again."
        : notice === "missing_env"
          ? "OAuth is not set up on the server. Use the personal API token field below, or add CLICKUP_CLIENT_ID and CLICKUP_CLIENT_SECRET."
          : notice === "no_db"
            ? "Database is not configured; cannot store the token."
            : notice === "token_exchange"
              ? "OAuth failed. Use the personal API token below, or check your ClickUp app redirect URL and secrets."
              : notice === "forbidden"
                ? "Only an admin can connect ClickUp for the workspace."
              : notice
                ? `Something went wrong (${notice}).`
                : null;

  const noticeIsError = Boolean(notice && notice !== "connected");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface">
      <ConfirmDialog
        open={disconnectOpen}
        title="Disconnect ClickUp?"
        description="You can reconnect anytime with OAuth or by saving your personal API token again."
        confirmLabel="Disconnect"
        cancelLabel="Stay connected"
        variant="danger"
        busy={busy}
        onCancel={() => !busy && setDisconnectOpen(false)}
        onConfirm={() => void executeDisconnect()}
      />

      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        ClickUp
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        One click opens ClickUp so you can approve access — no keys to type here. Or paste a
        personal API token only if you prefer that over OAuth.
      </p>

      {!clickupTableReady ? (
        <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <summary className="cursor-pointer font-medium">
            Database: create table first (one-time)
          </summary>
          <p className="mt-2 text-xs leading-relaxed opacity-90">
            Supabase → SQL Editor → run:
          </p>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-900 p-3 text-[11px] leading-snug text-zinc-100">
{`create table if not exists public.clickup_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.clickup_connections enable row level security;`}
          </pre>
        </details>
      ) : null}

      {noticeText ? (
        <p
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            noticeIsError
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          }`}
        >
          {noticeText}
        </p>
      ) : null}

      {inlineError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {inlineError}
        </p>
      ) : null}

      {clickupTableReady ? (
        <div className="mt-6 space-y-6">
          {connected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Connected to ClickUp
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDisconnectOpen(true)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  {busy ? "Working…" : "Disconnect"}
                </button>
              </div>
              {!oauthConfigured ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  You’re using a <strong className="font-medium">personal API token</strong>. The
                  purple <strong className="font-medium">Connect with ClickUp</strong> button only
                  appears after you add{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                    CLICKUP_CLIENT_ID
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                    CLICKUP_CLIENT_SECRET
                  </code>{" "}
                  in Vercel (or <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.local</code>)
                  and create a ClickUp OAuth app — otherwise the token field is the supported path.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Recommended
                </p>
                {oauthConfigured ? (
                  <a
                    href="/api/clickup/authorize"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover sm:w-auto sm:min-w-[14rem]"
                  >
                    Connect with ClickUp
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    OAuth is not configured on this server (no{" "}
                    <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                      CLICKUP_CLIENT_ID
                    </code>
                    ). Use your personal API token below — still one paste, no OAuth app required.
                  </p>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Optional — personal API token
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  From ClickUp → avatar → Settings → Apps → API Token. Starts with{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">pk_</code>. Read-only
                  use in this app (lists/tasks for pickers).
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="pk_…"
                    value={pkToken}
                    onChange={(e) => setPkToken(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-surface"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void savePersonalToken()}
                    className="shrink-0 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-surface dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    {busy ? "Saving…" : "Save token"}
                  </button>
                </div>
              </div>

              {oauthConfigured ? (
                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
                    Advanced: self-hosted OAuth redirect URL
                  </summary>
                  <p className="mt-2">
                    Register this redirect URL in your ClickUp OAuth app (only if you manage{" "}
                    <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">CLICKUP_*</code> env
                    vars):
                  </p>
                  <code className="mt-1 block break-all rounded-lg bg-zinc-100 px-2 py-2 text-[11px] dark:bg-zinc-900">
                    {callbackUrl}
                  </code>
                </details>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
