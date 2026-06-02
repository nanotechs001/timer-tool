"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { Client } from "@/lib/types";
import {
  ClickUpChannelSearchButton,
  type ClientLocationPick,
} from "@/components/clickup-list-search-button";
import { ConfirmDialog } from "@/components/confirm-dialog";

function sortClients(list: Client[]) {
  return [...list].sort((a, b) => {
    const ca = (a.company || "").localeCompare(b.company || "", undefined, {
      sensitivity: "base",
    });
    if (ca !== 0) return ca;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

type Props = { initialClients: Client[]; isAdmin?: boolean };

export function ClientsManager({ initialClients, isAdmin = false }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [clickupPick, setClickupPick] = useState<ClientLocationPick | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editClickupPick, setEditClickupPick] = useState<ClientLocationPick | null>(null);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  function openEdit(c: Client) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditEmail(c.email);
    setEditCompany(c.company);
    setEditNotes(c.notes);
    setEditClickupPick(null);
    setError(null);
  }

  function closeEdit() {
    setEditingId(null);
    setEditClickupPick(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editCompany.trim()) {
      setError("Client is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string | undefined> = {
        name: editName.trim() || editCompany.trim(),
        email: editEmail.trim(),
        company: editCompany.trim(),
        notes: editNotes.trim(),
      };
      if (editClickupPick) {
        body.clickupTeamId = editClickupPick.teamId || undefined;
        body.clickupSpaceId = editClickupPick.spaceId || undefined;
        body.clickupFolderId = editClickupPick.folderId || undefined;
        body.clickupListId = editClickupPick.listId || undefined;
      }
      const res = await fetch(`/api/clients/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save client");
      setClients((list) => sortClients(list.map((x) => (x.id === editingId ? (data as Client) : x))));
      closeEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function addClient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!company.trim()) {
      setError("Client is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          company: company.trim(),
          clickupTeamId: clickupPick?.teamId || undefined,
          clickupSpaceId: clickupPick?.spaceId || undefined,
          clickupFolderId: clickupPick?.folderId || undefined,
          clickupListId: clickupPick?.listId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add client");
      setClients((c) => sortClients([...c, data]));
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
      if (id === editingId) closeEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const btnPrimary =
    "cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50";
  const btnGhost =
    "cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900";
  const btnText =
    "cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100";
  const btnDanger =
    "cursor-pointer text-xs font-medium text-red-600 hover:underline dark:text-red-400";

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <ConfirmDialog
        open={removeId !== null}
        title="Delete client and all summaries?"
        description="This permanently deletes the client and every work summary linked to them. Share links for those summaries will stop working. This cannot be undone."
        confirmLabel="Delete all"
        cancelLabel="Cancel"
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
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New client</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Client <span className="text-red-600 dark:text-red-400">*</span>
            </span>
            <input
              required
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Client name"
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setClickupPick(null);
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Contact name <span className="font-normal text-zinc-400">(optional)</span>
            </span>
            <input
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="e.g. Account lead"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email <span className="font-normal text-zinc-400">(optional)</span>
            </span>
            <input
              type="email"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Set client from ClickUp <span className="font-normal text-zinc-400">(optional)</span>
            </span>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Picks a folder or list and fills <strong className="font-medium">Client</strong> with that
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
        <button type="submit" disabled={busy} className={`mt-6 ${btnPrimary}`}>
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
            clients.map((c) => {
              const primary = c.company?.trim() || c.name;
              const secondary = [c.name !== primary ? c.name : null, c.email].filter(Boolean).join(" · ");
              return (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{primary}</p>
                      <p className="text-xs text-zinc-500">{secondary || "—"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => (editingId === c.id ? closeEdit() : openEdit(c))}
                        className={btnText}
                      >
                        {editingId === c.id ? "Cancel" : "Edit"}
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setRemoveId(c.id)}
                          className={btnDanger}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {editingId === c.id ? (
                    <form
                      onSubmit={saveEdit}
                      className="mt-4 space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800"
                    >
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Client <span className="text-red-600 dark:text-red-400">*</span>
                        </span>
                        <input
                          required
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                          value={editCompany}
                          onChange={(e) => {
                            setEditCompany(e.target.value);
                            setEditClickupPick(null);
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Contact name <span className="font-normal text-zinc-400">(optional)</span>
                        </span>
                        <input
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Email <span className="font-normal text-zinc-400">(optional)</span>
                        </span>
                        <input
                          type="email"
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Notes <span className="font-normal text-zinc-400">(optional)</span>
                        </span>
                        <textarea
                          rows={2}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </label>
                      <div>
                        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Update ClickUp link (optional)
                        </span>
                        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Pick a folder or list to refresh client name and saved ClickUp path. Leave
                          untouched to keep the current link.
                        </p>
                        <ClickUpChannelSearchButton
                          onPick={(p) => {
                            setEditCompany(p.clientName);
                            setEditClickupPick(p);
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy} className={btnPrimary}>
                          {busy ? "Saving…" : "Save changes"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => closeEdit()}
                          className={btnGhost}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
