"use client";

import { useMemo, useRef, useState } from "react";
import { formatReportPeriodLine, isIsoDateOnlyString } from "@/lib/format";
import { useRouter } from "next/navigation";
import type { Client, LineItem, Report } from "@/lib/types";
import { totalHours } from "@/lib/types";
import { formatHours } from "@/lib/format";
import { nanoid } from "nanoid";
import { ClickUpWorkspacePicker } from "@/components/clickup-workspace-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Props = {
  clients: Client[];
  mode: "create" | "edit";
  initial?: Report;
  /** Only admins may delete a summary (API enforces this too). */
  canDelete?: boolean;
};

export function ReportForm({ clients, mode, initial, canDelete = false }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [clientId, setClientId] = useState<string | "">(initial?.clientId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [periodStart, setPeriodStart] = useState(() => {
    const s = (initial?.issueDate ?? "").trim();
    return isIsoDateOnlyString(s) ? s : "";
  });
  const [periodEnd, setPeriodEnd] = useState(() => {
    const s = (initial?.dueDate ?? "").trim();
    return isIsoDateOnlyString(s) ? s : "";
  });

  const legacyPeriodSnapshot = useMemo(() => {
    if (!initial) {
      return { hadLegacy: false, rawIssue: "", rawDue: "" };
    }
    const ri = (initial.issueDate ?? "").trim();
    const rd = (initial.dueDate ?? "").trim();
    const hadLegacy =
      Boolean(ri && !isIsoDateOnlyString(ri)) ||
      Boolean(rd && !isIsoDateOnlyString(rd));
    return {
      hadLegacy,
      rawIssue: initial.issueDate ?? "",
      rawDue: initial.dueDate ?? "",
    };
  }, [initial]);
  const [fromName, setFromName] = useState(initial?.billFromName ?? "");
  const [fromEmail, setFromEmail] = useState(initial?.billFromEmail ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length ? initial.lineItems : []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manualPanelOpen, setManualPanelOpen] = useState(false);
  const [clickUpPanelOpen, setClickUpPanelOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({
    task: "",
    hours: 0,
    notes: "",
  });
  const clickUpImportRef = useRef<HTMLDivElement>(null);

  const hoursSum = useMemo(() => totalHours(lineItems), [lineItems]);

  const selectedClient = useMemo(
    () => (clientId ? clients.find((c) => c.id === clientId) : undefined),
    [clients, clientId]
  );

  const clickUpInitial = useMemo(() => {
    const c = selectedClient;
    if (!c?.clickupTeamId || !c?.clickupSpaceId) return null;
    return {
      teamId: c.clickupTeamId,
      spaceId: c.clickupSpaceId,
      folderId: c.clickupFolderId ?? "",
      listId: c.clickupListId ?? "",
    };
  }, [selectedClient]);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLineItems((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function addManualDraftToLineItems() {
    const task = manualDraft.task.trim();
    if (!task) return;
    setLineItems((rows) => [
      ...rows,
      {
        id: nanoid(8),
        task,
        hours: manualDraft.hours,
        rate: 0,
        notes: manualDraft.notes.trim() || undefined,
      },
    ]);
    setManualDraft({ task: "", hours: 0, notes: "" });
  }

  function removeLine(id: string) {
    setLineItems((rows) => rows.filter((r) => r.id !== id));
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      let issueDate = periodStart.trim();
      let dueDate = periodEnd.trim();

      if (issueDate && dueDate && issueDate > dueDate) {
        throw new Error("Period end must be on or after the start date.");
      }

      if (
        mode === "edit" &&
        legacyPeriodSnapshot.hadLegacy &&
        !issueDate &&
        !dueDate
      ) {
        issueDate = legacyPeriodSnapshot.rawIssue.trim();
        dueDate = legacyPeriodSnapshot.rawDue.trim();
      }

      const payload = {
        title: title.trim(),
        clientId: clientId === "" ? null : clientId,
        lineItems: lineItems.map((r) => ({
          ...r,
          task: r.task.trim(),
          rate: 0,
          notes: r.notes?.trim() || undefined,
        })),
        currency: "USD",
        notes: notes.trim(),
        issueDate,
        dueDate,
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

  async function executeDeleteReport() {
    if (!initial) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${initial.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setDeleteDialogOpen(false);
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
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete this work summary?"
        description="This permanently removes the summary and its share link. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        busy={busy}
        onCancel={() => !busy && setDeleteDialogOpen(false)}
        onConfirm={() => void executeDeleteReport()}
      />

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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
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
          <p className="mt-1.5 text-xs text-zinc-500">
            On the Clients page, link <strong className="font-medium text-zinc-600 dark:text-zinc-400">company</strong> to a ClickUp folder or list. With the DB migration applied, picking that client here pre-fills task import to their path.
          </p>
        </label>
        <div className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Period (optional)
          </span>
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <label className="min-w-[11rem] flex-1">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                Start
              </span>
              <input
                type="date"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </label>
            <span className="hidden pb-2 text-sm text-zinc-400 sm:block" aria-hidden>
              –
            </span>
            <label className="min-w-[11rem] flex-1">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                End
              </span>
              <input
                type="date"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </label>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Shown on the public page and PDF as a readable range (e.g. May 1 – May 31, 2026).
          </p>
          {legacyPeriodSnapshot.hadLegacy && !periodStart && !periodEnd ? (
            <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              This summary still has a <strong className="font-medium">text period</strong> from before:{" "}
              {formatReportPeriodLine(legacyPeriodSnapshot.rawIssue, legacyPeriodSnapshot.rawDue)}.
              Choose dates above to replace it, or leave both empty and save to keep the old text.
            </p>
          ) : null}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Your name / team
          </span>
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-700/80 dark:bg-surface/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Tasks
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Add rows with <strong className="font-medium text-zinc-800 dark:text-zinc-200">Add manually</strong>{" "}
              (type task, hours, and per-task notes yourself) or use{" "}
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Load from ClickUp</strong>{" "}
              to open the importer, then pick workspace → channel → list → task. Hours come from
              ClickUp time tracked when available; row notes are always entered here in the app.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setManualPanelOpen((open) => !open);
                setClickUpPanelOpen(false);
              }}
              aria-expanded={manualPanelOpen}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-medium shadow-sm transition-colors ${
                manualPanelOpen
                  ? "border-brand bg-brand-soft text-brand dark:bg-brand/20 dark:text-brand-on-dark"
                  : "border-brand bg-white text-brand hover:bg-brand-soft dark:bg-surface dark:text-brand-on-dark dark:hover:bg-brand/15"
              }`}
            >
              Add manually
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setManualPanelOpen(false);
                setClickUpPanelOpen((open) => {
                  if (!open) {
                    requestAnimationFrame(() => {
                      clickUpImportRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }
                  return !open;
                });
              }}
              aria-expanded={clickUpPanelOpen}
              className={`rounded-lg border-2 border-brand px-3 py-2 text-xs font-medium text-brand-foreground shadow-sm transition-colors ${
                clickUpPanelOpen
                  ? "bg-brand-hover hover:bg-brand-hover/95"
                  : "bg-brand hover:bg-brand-hover"
              }`}
            >
              Load from ClickUp
            </button>
          </div>
        </div>

        <div ref={clickUpImportRef} className="scroll-mt-24">
          {clickUpPanelOpen ? (
            <div className="mt-4 rounded-xl border border-brand/30 bg-brand-soft/60 p-3 ring-offset-2 dark:border-brand/35 dark:bg-brand/15">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand dark:text-brand-on-dark">
                Import from ClickUp
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Go <strong className="font-medium">Workspace → Folder → List → Task</strong> (folder
                rows match company search), review <strong className="font-medium">hours</strong> from
                ClickUp when available, then <strong className="font-medium">Add row from this task</strong>.{" "}
                <strong className="font-medium">Notes</strong> are only in the table below.
              </p>
              <div className="mt-3">
                <ClickUpWorkspacePicker
                  key={clientId || "__no_client__"}
                  initialClickUp={clickUpInitial}
                  onAddFromClickUp={(task, hours) => {
                    setError(null);
                    setLineItems((rows) => [
                      ...rows,
                      {
                        id: nanoid(8),
                        task,
                        hours,
                        rate: 0,
                        notes: undefined,
                      },
                    ]);
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {manualPanelOpen ? (
          <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Add task manually
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Fill in the row, then <strong className="font-medium">Add to list</strong> to append it
              to the table below.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-12">
              <input
                className="sm:col-span-12 md:col-span-5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-surface"
                placeholder="Task description"
                value={manualDraft.task}
                onChange={(e) =>
                  setManualDraft((d) => ({ ...d, task: e.target.value }))
                }
              />
              <input
                type="number"
                min={0}
                step={0.25}
                className="sm:col-span-4 md:col-span-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-surface"
                placeholder="Hours"
                value={manualDraft.hours || ""}
                onChange={(e) =>
                  setManualDraft((d) => ({
                    ...d,
                    hours: Number(e.target.value) || 0,
                  }))
                }
              />
              <textarea
                rows={2}
                className="sm:col-span-8 md:col-span-5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-surface"
                placeholder="Notes (manual only)"
                value={manualDraft.notes}
                onChange={(e) =>
                  setManualDraft((d) => ({ ...d, notes: e.target.value }))
                }
              />
              <button
                type="button"
                className="col-span-12 justify-self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-sm hover:bg-brand-hover"
                onClick={() => addManualDraftToLineItems()}
              >
                Add to list
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Added tasks
          </h3>
          {lineItems.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-white/50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-surface/35">
              No tasks yet. Use <strong className="font-medium text-zinc-700 dark:text-zinc-300">Add manually</strong>{" "}
              or <strong className="font-medium text-zinc-700 dark:text-zinc-300">Load from ClickUp</strong> above.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-surface/55">
                    <th className="px-3 py-2.5 font-medium">Task</th>
                    <th className="w-24 px-3 py-2.5 font-medium">Hours</th>
                    <th className="min-w-[200px] px-3 py-2.5 font-medium">Notes</th>
                    <th className="w-24 px-3 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80"
                    >
                      <td className="align-top px-3 py-2">
                        <input
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-surface"
                          placeholder="Task description"
                          value={row.task}
                          onChange={(e) =>
                            updateLine(row.id, { task: e.target.value })
                          }
                        />
                      </td>
                      <td className="align-top px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums dark:border-zinc-800 dark:bg-surface"
                          placeholder="Hours"
                          value={row.hours || ""}
                          onChange={(e) =>
                            updateLine(row.id, {
                              hours: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="align-top px-3 py-2">
                        <textarea
                          rows={2}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-surface"
                          placeholder="Notes (manual only)"
                          value={row.notes ?? ""}
                          onChange={(e) =>
                            updateLine(row.id, {
                              notes: e.target.value.trim() || undefined,
                            })
                          }
                        />
                      </td>
                      <td className="align-top px-3 py-2">
                        <button
                          type="button"
                          className="whitespace-nowrap rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/65"
                          onClick={() => removeLine(row.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : mode === "create" ? "Create share link" : "Save changes"}
        </button>
        {mode === "edit" && initial && canDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleteDialogOpen(true)}
            className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
