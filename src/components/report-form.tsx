"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, LineItem, Report } from "@/lib/types";
import { totalHours } from "@/lib/types";
import { formatHours } from "@/lib/format";
import { nanoid } from "nanoid";

type Props = {
  clients: Client[];
  mode: "create" | "edit";
  initial?: Report;
};

const emptyLine = (): LineItem => ({
  id: nanoid(8),
  task: "",
  hours: 0,
  rate: 0,
  resourceUrl: undefined,
});

export function ReportForm({ clients, mode, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [clientId, setClientId] = useState<string | "">(initial?.clientId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [periodLabel, setPeriodLabel] = useState(initial?.issueDate ?? "");
  const [secondLabel, setSecondLabel] = useState(initial?.dueDate ?? "");
  const [fromName, setFromName] = useState(initial?.billFromName ?? "");
  const [fromEmail, setFromEmail] = useState(initial?.billFromEmail ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length ? initial.lineItems : [emptyLine()]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursSum = useMemo(() => totalHours(lineItems), [lineItems]);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLineItems((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function addLine() {
    setLineItems((rows) => [...rows, emptyLine()]);
  }

  function removeLine(id: string) {
    setLineItems((rows) =>
      rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)
    );
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        clientId: clientId === "" ? null : clientId,
        lineItems: lineItems.map((r) => ({
          ...r,
          task: r.task.trim(),
          rate: 0,
          resourceUrl: r.resourceUrl?.trim() || undefined,
        })),
        currency: "USD",
        notes: notes.trim(),
        issueDate: periodLabel.trim(),
        dueDate: secondLabel.trim(),
        billFromName: fromName.trim(),
        billFromEmail: fromEmail.trim(),
      };

      if (mode === "create") {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        router.push(`/reports/${data.id}`);
        router.refresh();
      } else if (initial) {
        const res = await fetch(`/api/reports/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Update failed");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeReport() {
    if (!initial || !confirm("Delete this work summary permanently?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${initial.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Summary title
          </span>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint 12 — Acme"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Client
          </span>
          <select
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={clientId}
            onChange={(e) =>
              setClientId(e.target.value === "" ? "" : e.target.value)
            }
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` (${c.company})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Period / label (optional)
          </span>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="e.g. May 2026"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Second line (optional)
          </span>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={secondLabel}
            onChange={(e) => setSecondLabel(e.target.value)}
            placeholder="e.g. Week 19"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your name / team
          </span>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Contact email (optional)
          </span>
          <input
            type="email"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Notes
          </span>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Tasks
          </h2>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Add task
          </button>
        </div>
        <div className="space-y-3">
          {lineItems.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30 sm:grid-cols-12"
            >
              <input
                className="sm:col-span-6 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="What was done"
                value={row.task}
                onChange={(e) => updateLine(row.id, { task: e.target.value })}
              />
              <input
                type="number"
                min={0}
                step={0.25}
                className="sm:col-span-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Hours"
                value={row.hours || ""}
                onChange={(e) =>
                  updateLine(row.id, { hours: Number(e.target.value) || 0 })
                }
              />
              <input
                className="sm:col-span-3 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Reference URL"
                value={row.resourceUrl ?? ""}
                onChange={(e) =>
                  updateLine(row.id, {
                    resourceUrl: e.target.value.trim() || undefined,
                  })
                }
              />
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-950 sm:col-span-1"
                onClick={() => removeLine(row.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
          <span className="text-zinc-500">Total time</span>
          <span className="ml-4 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatHours(hoursSum)} hrs
          </span>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : mode === "create" ? "Create share link" : "Save changes"}
        </button>
        {mode === "edit" && initial ? (
          <button
            type="button"
            disabled={busy}
            onClick={removeReport}
            className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
