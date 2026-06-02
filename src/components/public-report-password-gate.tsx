"use client";

import { useState } from "react";

type Props = {
  slug: string;
};

export function PublicReportPasswordGate({ slug }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/r/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invalid password");
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Password protected report
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This report link is protected. Enter the password to continue.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
            placeholder="Enter password"
          />
        </label>
        <button
          type="button"
          disabled={busy || password.trim().length === 0}
          onClick={() => void submit()}
          className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Checking..." : "Unlock report"}
        </button>
      </section>
    </main>
  );
}
