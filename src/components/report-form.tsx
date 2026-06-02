"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatHours,
  formatReportPeriodLine,
  formatSummaryUpdatedAt,
  isIsoDateOnlyString,
} from "@/lib/format";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { publicAppUrl } from "@/lib/config";
import type { Client, LineItem, Report } from "@/lib/types";
import { totalPlannedHours, totalWorkedHours } from "@/lib/types";
import { nanoid } from "nanoid";
import { ClickUpWorkspacePicker } from "@/components/clickup-workspace-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoticeDialog } from "@/components/notice-dialog";
import { ReportPreviewDialog } from "@/components/report-preview-dialog";
import { ShareLinkCreatedDialog } from "@/components/share-link-created-dialog";
import { ClickUpPreloader } from "@/components/clickup-preloader";

type Props = {
  clients: Client[];
  mode: "create" | "edit";
  initial?: Report;
  /** Only admins may delete a summary (API enforces this too). */
  canDelete?: boolean;
};

type ReportSnapshot = {
  id: string;
  savedAt: string;
  title: string;
  clientId: string;
  notes: string;
  periodStart: string;
  periodEnd: string;
  fromName: string;
  fromEmail: string;
  lineItems: LineItem[];
};

type ReportDraft = {
  title: string;
  clientId: string;
  notes: string;
  periodStart: string;
  periodEnd: string;
  fromName: string;
  fromEmail: string;
  lineItems: LineItem[];
};

const SNAPSHOT_PAGE_SIZE = 5;

function resolvedWorked(r: LineItem): number {
  if (
    r.hoursWorked !== undefined &&
    r.hoursWorked !== null &&
    Number.isFinite(Number(r.hoursWorked))
  ) {
    return Number(r.hoursWorked);
  }
  return r.hours;
}

function normalizeFormLineItems(items: LineItem[] | undefined): LineItem[] {
  if (!items?.length) return [];
  return items.map((row) => ({
    ...row,
    hoursWorked: resolvedWorked(row),
  }));
}

function validationHintFromBody(data: Record<string, unknown>): string | null {
  const issues = data.issues as
    | {
        fieldErrors?: Record<string, string[] | undefined>;
        formErrors?: string[];
      }
    | undefined;
  if (!issues) return null;
  const parts: string[] = [];
  if (issues.formErrors?.length) parts.push(...issues.formErrors);
  if (issues.fieldErrors) {
    for (const msgs of Object.values(issues.fieldErrors)) {
      if (msgs?.length) parts.push(...msgs);
    }
  }
  const uniq = [...new Set(parts)];
  return uniq.length ? uniq.slice(0, 5).join(" · ") : null;
}

const MANUAL_FIELD_WRAP = "relative block";
const MANUAL_FIELD_LABEL =
  "absolute left-3 top-0 z-10 -translate-y-1/2 cursor-default select-none bg-white px-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-surface dark:text-zinc-400";
const MANUAL_INPUT_CLASS =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 pb-2 pt-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-surface dark:text-zinc-100";
const MANUAL_TEXTAREA_CLASS =
  "w-full resize-y rounded-lg border border-zinc-200 bg-white px-2.5 pb-2 pt-2.5 text-xs leading-snug outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-surface dark:text-zinc-100";

function buildPublicReportUrl(slug: string): string {
  const base = publicAppUrl();
  if (base) return `${base}/r/${slug}`;
  if (typeof window !== "undefined") return `${window.location.origin}/r/${slug}`;
  return `/r/${slug}`;
}

function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function snapshotToPreviewReport(
  base: Report,
  snapshot: ReportSnapshot
): Report {
  return {
    ...base,
    title: snapshot.title || base.title,
    clientId: snapshot.clientId || null,
    notes: snapshot.notes,
    issueDate: snapshot.periodStart,
    dueDate: snapshot.periodEnd,
    billFromName: snapshot.fromName,
    billFromEmail: snapshot.fromEmail,
    lineItems: snapshot.lineItems,
    updatedAt: snapshot.savedAt,
  };
}

export function ReportForm({
  clients,
  mode,
  initial,
  canDelete = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [hasPublicPassword, setHasPublicPassword] = useState(
    Boolean(initial?.hasPublicPassword)
  );
  const [accessPassword, setAccessPassword] = useState("");
  const [clearAccessPassword, setClearAccessPassword] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>(() =>
    normalizeFormLineItems(initial?.lineItems)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    description: string;
    /** Runs when user clicks OK, before dialog closes */
    onOk?: () => void;
  } | null>(null);
  const [createdShare, setCreatedShare] = useState<{
    id: string;
    title: string;
    publicUrl: string;
  } | null>(null);
  const [manualPanelOpen, setManualPanelOpen] = useState(false);
  const [clickUpPanelOpen, setClickUpPanelOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotsPage, setSnapshotsPage] = useState(1);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [snapshotToLoad, setSnapshotToLoad] = useState<ReportSnapshot | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<ReportSnapshot | null>(null);
  const [manualDraft, setManualDraft] = useState({
    task: "",
    hoursWorkedStr: "",
    hoursTotalStr: "",
    notes: "",
  });
  const clickUpImportRef = useRef<HTMLDivElement>(null);

  const workedSum = useMemo(() => totalWorkedHours(lineItems), [lineItems]);
  const plannedSum = useMemo(() => totalPlannedHours(lineItems), [lineItems]);

  const selectedClient = useMemo(
    () => (clientId ? clients.find((c) => c.id === clientId) : undefined),
    [clients, clientId]
  );
  const snapshotPreviewClient = useMemo(
    () =>
      snapshotPreview?.clientId
        ? (clients.find((c) => c.id === snapshotPreview.clientId) ?? null)
        : null,
    [clients, snapshotPreview]
  );
  const snapshotPreviewReport = useMemo(
    () =>
      mode === "edit" && initial && snapshotPreview
        ? snapshotToPreviewReport(initial, snapshotPreview)
        : null,
    [initial, mode, snapshotPreview]
  );
  const previewShareBase = publicAppUrl();

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

  function captureDraft(): ReportDraft {
    return {
      title: title.trim(),
      clientId: clientId === "" ? "" : clientId,
      notes: notes.trim(),
      periodStart: periodStart.trim(),
      periodEnd: periodEnd.trim(),
      fromName: fromName.trim(),
      fromEmail: fromEmail.trim(),
      lineItems: lineItems.map((r) => ({
        ...r,
        task: r.task.trim(),
        rate: 0,
        notes: r.notes?.trim() || undefined,
      })),
    };
  }

  function draftSignature() {
    return JSON.stringify(captureDraft());
  }

  const [lastSavedSignature, setLastSavedSignature] = useState(() =>
    JSON.stringify(captureDraft())
  );
  const currentSignature = draftSignature();
  const passwordDirty = Boolean(accessPassword.trim()) || clearAccessPassword;
  const isDirty =
    mode === "edit" ? currentSignature !== lastSavedSignature || passwordDirty : true;
  const totalSnapshotPages = Math.max(1, Math.ceil(snapshots.length / SNAPSHOT_PAGE_SIZE));
  const snapshotPage = Math.min(snapshotsPage, totalSnapshotPages);
  const pagedSnapshots = useMemo(() => {
    const start = (snapshotPage - 1) * SNAPSHOT_PAGE_SIZE;
    return snapshots.slice(start, start + SNAPSHOT_PAGE_SIZE);
  }, [snapshotPage, snapshots]);

  useEffect(() => {
    const base = captureDraft();
    setLastSavedSignature(JSON.stringify(base));
    setHasPublicPassword(Boolean(initial?.hasPublicPassword));
    setAccessPassword("");
    setClearAccessPassword(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  async function fetchSnapshots() {
    if (mode !== "edit" || !initial) return;
    setSnapshotsLoading(true);
    try {
      const res = await fetch(`/api/reports/${initial.id}/snapshots`);
      const data = (await res.json().catch(() => [])) as unknown;
      if (!res.ok) {
        throw new Error("Failed to load previous reports.");
      }
      if (!Array.isArray(data)) {
        setSnapshots([]);
        return;
      }
      const mapped = data
        .filter((row) => row && typeof row === "object")
        .map((row) => {
          const r = row as Record<string, unknown>;
          return {
            id: String(r.id ?? ""),
            savedAt: String(r.createdAt ?? ""),
            title: String(r.title ?? ""),
            clientId: typeof r.clientId === "string" ? r.clientId : "",
            notes: String(r.notes ?? ""),
            periodStart: String(r.issueDate ?? ""),
            periodEnd: String(r.dueDate ?? ""),
            fromName: String(r.billFromName ?? ""),
            fromEmail: String(r.billFromEmail ?? ""),
            lineItems: Array.isArray(r.lineItems) ? (r.lineItems as LineItem[]) : [],
          } satisfies ReportSnapshot;
        })
        .filter((row) => row.id);
      setSnapshots(mapped);
      setSnapshotsPage(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load previous reports.";
      setError(msg);
    } finally {
      setSnapshotsLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "edit") return;
    if (searchParams.get("view") !== "previous") return;
    setSnapshotsOpen(true);
    void fetchSnapshots();
    const next = new URLSearchParams(searchParams.toString());
    next.delete("view");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [mode, pathname, router, searchParams]);

  function loadSnapshot(snapshot: ReportSnapshot) {
    setTitle(snapshot.title);
    setClientId(snapshot.clientId === "" ? "" : snapshot.clientId);
    setNotes(snapshot.notes);
    setPeriodStart(snapshot.periodStart);
    setPeriodEnd(snapshot.periodEnd);
    setFromName(snapshot.fromName);
    setFromEmail(snapshot.fromEmail);
    setLineItems(snapshot.lineItems);
    setError(null);
  }

  function confirmLoadSnapshot() {
    if (!snapshotToLoad) return;
    loadSnapshot(snapshotToLoad);
    setSnapshotToLoad(null);
  }

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLineItems((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function parseHoursField(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }

  function appendManualLine(task: string, total: number, worked: number, notesTrim: string | undefined) {
    let w = worked;
    if (w > total) w = total;
    setLineItems((rows) => [
      ...rows,
      {
        id: nanoid(8),
        task,
        hours: total,
        hoursWorked: w,
        rate: 0,
        notes: notesTrim,
      },
    ]);
    setManualDraft({ task: "", hoursWorkedStr: "", hoursTotalStr: "", notes: "" });
  }

  function addManualDraftToLineItems() {
    const task = manualDraft.task.trim();
    if (!task) return;
    let total = parseHoursField(manualDraft.hoursTotalStr);
    let worked = parseHoursField(manualDraft.hoursWorkedStr);
    const notesTrim = manualDraft.notes.trim() || undefined;
    if (total === null && worked === null) {
      setNotice({
        title: "Hours required",
        description: "Enter total hours or hours worked (or both) before adding this task to the list.",
      });
      return;
    }
    if (total === null && worked !== null) {
      const w = worked;
      setNotice({
        title: "Total hours not set",
        description:
          "You entered hours worked but left total hours empty. We’ll use that same value for both planned total and worked time.",
        onOk: () => appendManualLine(task, w, w, notesTrim),
      });
      return;
    }
    if (worked === null && total !== null) {
      worked = total;
    }
    if (total === null || worked === null) return;
    appendManualLine(task, total, worked, notesTrim);
  }

  function handleNoticeOk() {
    const cb = notice?.onOk;
    if (cb) cb();
    setNotice(null);
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

      const draft = captureDraft();
      const payload = {
        title: draft.title,
        clientId: draft.clientId === "" ? null : draft.clientId,
        lineItems: draft.lineItems,
        currency: "USD",
        notes: draft.notes,
        issueDate,
        dueDate,
        billFromName: draft.fromName,
        billFromEmail: draft.fromEmail,
        accessPassword: accessPassword.trim() || undefined,
        clearAccessPassword: clearAccessPassword || undefined,
      };

      if (mode === "create") {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          throw new Error(
            validationHintFromBody(data) ??
              (typeof data.error === "string" ? data.error : null) ??
              "Save failed"
          );
        }
        const newId = data.id;
        const slug = typeof data.slug === "string" ? data.slug : "";
        if (typeof newId !== "string" || !newId || !slug) {
          throw new Error("Save failed");
        }
        setCreatedShare({
          id: newId,
          title: title.trim() || "Summary",
          publicUrl: buildPublicReportUrl(slug),
        });
        setHasPublicPassword(Boolean(accessPassword.trim()));
        setAccessPassword("");
        setClearAccessPassword(false);
        router.refresh();
      } else if (initial) {
        const res = await fetch(`/api/reports/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          throw new Error(
            validationHintFromBody(data) ??
              (typeof data.error === "string" ? data.error : null) ??
              "Update failed"
          );
        }
        setLastSavedSignature(JSON.stringify(draft));
        if (clearAccessPassword) {
          setHasPublicPassword(false);
        } else if (accessPassword.trim()) {
          setHasPublicPassword(true);
        }
        setAccessPassword("");
        setClearAccessPassword(false);
        if (snapshotsOpen) {
          void fetchSnapshots();
        }
        setNotice({
          title: "Summary updated",
          description: "Your changes were saved successfully.",
        });
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

  function closeCreatedShareAndEdit() {
    if (!createdShare) return;
    const id = createdShare.id;
    setCreatedShare(null);
    router.push(`/reports/${id}`);
    router.refresh();
  }

  function resetEditData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setTitle("");
    setPeriodStart(toDateInputValue(startOfMonth));
    setPeriodEnd(toDateInputValue(now));
    setNotes("");
    setLineItems((rows) =>
      rows.map((row) => ({
        ...row,
        hoursWorked: 0,
      }))
    );
    setError(null);
  }

  return (
    <div className="mx-auto mt-6 mb-12 max-w-3xl space-y-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-surface sm:mb-16 sm:p-6">
      <ClickUpPreloader initialClickUp={clickUpInitial} />
      <ReportPreviewDialog
        report={snapshotPreviewReport}
        client={snapshotPreviewClient}
        shareBase={previewShareBase}
        onClose={() => setSnapshotPreview(null)}
        onEditSummary={() => setSnapshotPreview(null)}
        hideEditSummaryAction
        hidePublicActions
      />
      <ShareLinkCreatedDialog
        open={createdShare !== null}
        reportTitle={createdShare?.title ?? ""}
        publicUrl={createdShare?.publicUrl ?? ""}
        onClose={closeCreatedShareAndEdit}
      />
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
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Clear summary data?"
        description="This resets the title, period, overview, and worked hours. Total hours stay unchanged."
        confirmLabel="Clear data"
        cancelLabel="Cancel"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetEditData();
          setResetConfirmOpen(false);
        }}
      />
      <ConfirmDialog
        open={snapshotToLoad !== null}
        title="Load this snapshot?"
        description="This will replace your current form values with the selected snapshot."
        confirmLabel="Load snapshot"
        cancelLabel="Cancel"
        onCancel={() => setSnapshotToLoad(null)}
        onConfirm={confirmLoadSnapshot}
      />
      {mode === "edit" && initial && snapshotsOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-[1px]"
            aria-label="Close previous reports"
            onClick={() => setSnapshotsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="previous-reports-title"
            className="relative z-[101] w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-surface"
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2
                id="previous-reports-title"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Previous reports
              </h2>
              <button
                type="button"
                onClick={() => setSnapshotsOpen(false)}
                className="cursor-pointer rounded-lg px-2.5 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Close
              </button>
            </div>
            {snapshotsLoading ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
                Loading previous reports...
              </div>
            ) : snapshots.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
                  <table className="w-full min-w-[420px] text-left text-xs">
                    <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-surface/55">
                      <tr>
                        <th className="px-3 py-2 font-medium">Summary title</th>
                        <th className="px-3 py-2 font-medium">Saved</th>
                        <th className="px-3 py-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSnapshots.map((snapshot) => (
                        <tr
                          key={snapshot.id}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                        >
                          <td className="px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-100">
                            {snapshot.title || "Untitled summary"}
                          </td>
                          <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                            {formatSummaryUpdatedAt(snapshot.savedAt)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSnapshotPreview(snapshot)}
                                className="cursor-pointer rounded-md border border-brand/40 bg-brand-soft/70 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft dark:border-brand/40 dark:bg-brand/20 dark:text-brand-on-dark dark:hover:bg-brand/25"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => setSnapshotToLoad(snapshot)}
                                className="cursor-pointer rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover"
                              >
                                Load
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {snapshots.length > SNAPSHOT_PAGE_SIZE ? (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSnapshotsPage((p) => Math.max(1, p - 1))}
                      disabled={snapshotPage <= 1}
                      className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-surface dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Page {snapshotPage} of {totalSnapshotPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSnapshotsPage((p) => Math.min(totalSnapshotPages, p + 1))
                      }
                      disabled={snapshotPage >= totalSnapshotPages}
                      className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-surface dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-white/70 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-surface/35 dark:text-zinc-400">
                No snapshots yet. Click <strong className="font-medium">Save changes</strong> to store one.
              </p>
            )}
          </div>
        </div>
      ) : null}
      <NoticeDialog
        open={notice !== null}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        onOk={handleNoticeOk}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      ) : null}

      {mode === "edit" && initial ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Last updated {formatSummaryUpdatedAt(initial.updatedAt || initial.createdAt)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-surface dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Reset data
              </button>
            </div>
          </div>
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
            {clients.map((c) => {
              const primary = c.company?.trim() || c.name;
              const extra =
                c.company?.trim() && c.name && c.name !== primary ? ` · ${c.name}` : "";
              return (
                <option key={c.id} value={c.id}>
                  {primary}
                  {extra}
                </option>
              );
            })}
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
            Overview
          </span>
          <span className="mb-1.5 block text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Shown on the public summary and PDF (optional).
          </span>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. What shipped, what’s next, or anything you want them to remember."
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Public link password (optional)
          </span>
          <span className="mb-1.5 block text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {hasPublicPassword
              ? "Password is currently enabled. Set a new password or remove protection below."
              : "Set a password to require access before someone can view this report link."}
          </span>
          <input
            type="password"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-brand/25 dark:border-zinc-800 dark:bg-surface"
            value={accessPassword}
            onChange={(e) => {
              setAccessPassword(e.target.value);
              if (e.target.value.trim()) setClearAccessPassword(false);
            }}
            placeholder={hasPublicPassword ? "Leave blank to keep current password" : "Set password"}
          />
          {mode === "edit" && hasPublicPassword ? (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={clearAccessPassword}
                onChange={(e) => {
                  setClearAccessPassword(e.target.checked);
                  if (e.target.checked) setAccessPassword("");
                }}
                className="h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand/30 dark:border-zinc-700"
              />
              Remove password protection
            </label>
          ) : null}
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
              (task, <strong className="font-medium text-zinc-800 dark:text-zinc-200">worked hours</strong>,{" "}
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">total / planned hours</strong>, and
              per-task notes) or use{" "}
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Load from ClickUp</strong>{" "}
              to import a task. Tracked time fills both columns until you adjust them; notes stay in the table below.
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
              className={`cursor-pointer rounded-lg border-2 px-3 py-2 text-xs font-medium shadow-sm transition-colors ${
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
              className={`cursor-pointer rounded-lg border-2 border-brand px-3 py-2 text-xs font-medium text-brand-foreground shadow-sm transition-colors ${
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
                Both <strong className="font-medium">worked</strong> and <strong className="font-medium">total</strong>{" "}
                start from that value; edit in the table if the budget differs.{" "}
                <strong className="font-medium">Notes</strong> are only in the table below.
              </p>
              <div className="mt-3">
                <ClickUpWorkspacePicker
                  key={clientId || "__no_client__"}
                  initialClickUp={clickUpInitial}
                  onAddFromClickUp={(task, total, worked) => {
                    setError(null);
                    const cap = Math.max(0, total);
                    const raw =
                      worked === undefined || worked === null ? cap : worked;
                    const w = Math.min(Math.max(0, raw), cap);
                    setLineItems((rows) => [
                      ...rows,
                      {
                        id: nanoid(8),
                        task,
                        hours: cap,
                        hoursWorked: w,
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
            <div className="mt-3 grid gap-3 sm:grid-cols-12">
              <div className={`${MANUAL_FIELD_WRAP} sm:col-span-12 md:col-span-4`}>
                <label htmlFor="manual-task" className={MANUAL_FIELD_LABEL}>
                  Task
                </label>
                <input
                  id="manual-task"
                  autoComplete="off"
                  className={MANUAL_INPUT_CLASS}
                  placeholder="e.g. Web development"
                  value={manualDraft.task}
                  onChange={(e) =>
                    setManualDraft((d) => ({ ...d, task: e.target.value }))
                  }
                />
              </div>
              <div className={`${MANUAL_FIELD_WRAP} sm:col-span-6 md:col-span-2`}>
                <label htmlFor="manual-worked" className={MANUAL_FIELD_LABEL}>
                  Hours worked
                </label>
                <input
                  id="manual-worked"
                  type="number"
                  inputMode="decimal"
                  className={`${MANUAL_INPUT_CLASS} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="0"
                  value={manualDraft.hoursWorkedStr}
                  onChange={(e) =>
                    setManualDraft((d) => ({ ...d, hoursWorkedStr: e.target.value }))
                  }
                />
              </div>
              <div className={`${MANUAL_FIELD_WRAP} sm:col-span-6 md:col-span-2`}>
                <label htmlFor="manual-total" className={MANUAL_FIELD_LABEL}>
                  Total hours
                </label>
                <input
                  id="manual-total"
                  type="number"
                  inputMode="decimal"
                  className={`${MANUAL_INPUT_CLASS} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="0"
                  value={manualDraft.hoursTotalStr}
                  onChange={(e) =>
                    setManualDraft((d) => ({ ...d, hoursTotalStr: e.target.value }))
                  }
                />
              </div>
              <div className={`${MANUAL_FIELD_WRAP} sm:col-span-12 md:col-span-4`}>
                <label htmlFor="manual-notes" className={MANUAL_FIELD_LABEL}>
                  Notes
                </label>
                <textarea
                  id="manual-notes"
                  rows={2}
                  className={MANUAL_TEXTAREA_CLASS}
                  placeholder="Optional"
                  value={manualDraft.notes}
                  onChange={(e) =>
                    setManualDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                className="col-span-12 cursor-pointer justify-self-start rounded-lg bg-brand px-5 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-sm hover:bg-brand-hover"
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
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-surface/55">
                    <th className="px-3 py-2.5 font-medium">Task</th>
                    <th className="w-24 px-3 py-2.5 font-medium">Worked</th>
                    <th className="w-24 px-3 py-2.5 font-medium">Total</th>
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
                          inputMode="decimal"
                          className="w-full cursor-text rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums [appearance:textfield] dark:border-zinc-800 dark:bg-surface [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                          value={resolvedWorked(row)}
                          onChange={(e) => {
                            const w = Number(e.target.value) || 0;
                            updateLine(row.id, {
                              hoursWorked: Math.min(Math.max(0, w), row.hours),
                            });
                          }}
                        />
                      </td>
                      <td className="align-top px-3 py-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          className="w-full cursor-text rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm tabular-nums [appearance:textfield] dark:border-zinc-800 dark:bg-surface [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="0"
                          value={row.hours}
                          onChange={(e) => {
                            const total = Number(e.target.value) || 0;
                            updateLine(row.id, {
                              hours: total,
                              hoursWorked: Math.min(resolvedWorked(row), total),
                            });
                          }}
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
                          className="cursor-pointer whitespace-nowrap rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/65"
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
        <div className="mt-4 flex flex-col items-end gap-1 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
          <div>
            <span className="text-zinc-500">Total worked</span>
            <span className="ml-4 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatHours(workedSum)} hrs
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Total (planned)</span>
            <span className="ml-4 text-base font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
              {formatHours(plannedSum)} hrs
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || (mode === "edit" && !isDirty)}
          onClick={submit}
          className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : mode === "create" ? "Create share link" : "Save changes"}
        </button>
        {mode === "edit" && initial && canDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleteDialogOpen(true)}
            className="cursor-pointer rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
