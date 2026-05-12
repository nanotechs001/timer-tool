"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Client } from "@/lib/types";
import {
  ClickUpChannelSearchButton,
  type ClientLocationPick,
} from "@/components/clickup-list-search-button";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Props = { initialClients: Client[] };

export function ClientsManager({ initialClients }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [clickupPick, setClickupPick] = useState<ClientLocationPick | null>(null);

  async function addClient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          clickupTeamId: clickupPick?.teamId || undefined,
          clickupSpaceId: clickupPick?.spaceId || undefined,
          clickupFolderId: clickupPick?.folderId || undefined,
          clickupListId: clickupPick?.listId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add client");
      setClients((c) => [...c, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setEmail("");
      setCompany("");
      setClickupPick(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    if (!removeId) return;
    const id = removeId;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setClients((c) => c.filter((x) => x.id !== id));
      setRemoveId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <ConfirmDialog
        open={removeId !== null}
        title="Remove client?"
        description="This removes the client from your list. Work summaries that reference this client will keep their text but may show no linked client."
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        busy={busy}
        onCancel={() => !busy && setRemoveId(null)}
        onConfirm={() => void confirmRemove()}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={addClient}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-surface"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          New client
        </h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Name
            </span>
            <input
              required
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Contact or client name (manual)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Email
              </span>
              <input
                type="email"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Company
              </span>
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                placeholder="Company (manual or from ClickUp below)"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setClickupPick(null);
                }}
              />
            </label>
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Set company from ClickUp
            </span>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Picks a folder or list and fills <strong className="font-medium">Company</strong> with that
              name. Also saves the ClickUp path for task import when you run the database migration.
            </p>
            <ClickUpChannelSearchButton
              onPick={(p) => {
                setCompany(p.clientName);
                setClickupPick(p);
              }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add client"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          All clients ({clients.length})
        </h2>
        <ul className="mt-4 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-surface">
          {clients.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-zinc-500">
              No clients yet. Add one above.
            </li>
          ) : (
            clients.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</p>
                  <p className="text-xs text-zinc-500">
                    {[c.company, c.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRemoveId(c.id)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
