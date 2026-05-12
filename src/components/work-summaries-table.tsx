"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Client, Report } from "@/lib/types";
import { totalPlannedHours, totalWorkedHours } from "@/lib/types";
import { formatHours, formatSummaryCreatedAt } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ReportPreviewDialog } from "@/components/report-preview-dialog";

function toAbsoluteShareUrl(shareDisplay: string): string {
  if (shareDisplay.startsWith("http://") || shareDisplay.startsWith("https://")) {
    return shareDisplay;
  }
  if (typeof window === "undefined") return shareDisplay;
  const path = shareDisplay.startsWith("/") ? shareDisplay : `/${shareDisplay}`;
  return `${window.location.origin}${path}`;
}

export type SummaryRow = {
  report: Report;
  client: Client | null;
};

type ClientGroup = {
  key: string;
  label: string;
  subtitle: string | null;
  rows: SummaryRow[];
};

function groupByClient(rows: SummaryRow[]): ClientGroup[] {
  const map = new Map<string, SummaryRow[]>();
  for (const row of rows) {
    const k = row.client?.id ?? "__none__";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  const groups: ClientGroup[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.report.createdAt || 0).getTime() -
        new Date(a.report.createdAt || 0).getTime()
    );
    const firstClient = list[0]?.client ?? null;
    groups.push({
      key,
      label: firstClient ? firstClient.name : "No client",
      subtitle: firstClient?.company?.trim() ? firstClient.company : null,
      rows: sorted,
    });
  }
  groups.sort((a, b) => {
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
  return groups;
}

function normalizeDateRange(from: string, to: string): { start?: Date; end?: Date } {
  const f = from.trim();
  const t = to.trim();
  let start = f ? new Date(`${f}T00:00:00`) : undefined;
  let end = t ? new Date(`${t}T23:59:59.999`) : undefined;
  if (start && Number.isNaN(start.getTime())) start = undefined;
  if (end && Number.isNaN(end.getTime())) end = undefined;
  if (start && end && start.getTime() > end.getTime()) {
    start = t ? new Date(`${t}T00:00:00`) : undefined;
    end = f ? new Date(`${f}T23:59:59.999`) : undefined;
  }
  return { start, end };
}

function rowInDateRange(row: SummaryRow, start?: Date, end?: Date): boolean {
  if (!start && !end) return true;
  const t = new Date(row.report.createdAt || 0).getTime();
  if (Number.isNaN(t)) return false;
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

function rowMatchesSearch(row: SummaryRow, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const { report, client } = row;
  if (report.title.toLowerCase().includes(s)) return true;
  if (client) {
    if (client.name.toLowerCase().includes(s)) return true;
    if (client.company.toLowerCase().includes(s)) return true;
  }
  for (const line of report.lineItems) {
    if (line.task.toLowerCase().includes(s)) return true;
  }
  return false;
}

function filterRows(
  rows: SummaryRow[],
  search: string,
  dateFrom: string,
  dateTo: string
): SummaryRow[] {
  const { start, end } = normalizeDateRange(dateFrom, dateTo);
  return rows.filter(
    (row) => rowInDateRange(row, start, end) && rowMatchesSearch(row, search)
  );
}

type CopyTip = { reportId: string; ok: boolean };

type TipPos = { x: number; y: number };

type Props = {
  rows: SummaryRow[];
  shareBase: string;
  isAdmin?: boolean;
};

type FolderDeleteTarget = { clientId: string; label: string; count: number };
type ReportDeleteTarget = { reportId: string; title: string };

export function WorkSummariesTable({ rows, shareBase, isAdmin = false }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<SummaryRow | null>(null);
  const [copyTip, setCopyTip] = useState<CopyTip | null>(null);
  const [tipPos, setTipPos] = useState<TipPos>({ x: 0, y: 0 });
  const copyTipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAnchorRef = useRef<HTMLElement | null>(null);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [folderView, setFolderView] = useState<"root" | "client">("root");
  const [openClientKey, setOpenClientKey] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderDeleteTarget | null>(null);
  const [folderDeleteBusy, setFolderDeleteBusy] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ReportDeleteTarget | null>(null);
  const [reportDeleteBusy, setReportDeleteBusy] = useState(false);

  const filteredRows = useMemo(
    () => filterRows(rows, search, dateFrom, dateTo),
    [rows, search, dateFrom, dateTo]
  );

  const groups = useMemo(() => groupByClient(filteredRows), [filteredRows]);

  const openGroup = useMemo(
    () => (openClientKey ? groups.find((g) => g.key === openClientKey) : null),
    [groups, openClientKey]
  );

  useEffect(() => {
    if (folderView !== "client" || !openClientKey) return;
    const g = groups.find((x) => x.key === openClientKey);
    if (!g || g.rows.length === 0) {
      setFolderView("root");
      setOpenClientKey(null);
    }
  }, [folderView, openClientKey, groups]);

  const showCopyTip = useCallback(
    (reportId: string, ok: boolean, anchor: HTMLElement) => {
      if (copyTipTimer.current) clearTimeout(copyTipTimer.current);
      copyAnchorRef.current = anchor;
      const r = anchor.getBoundingClientRect();
      setTipPos({ x: r.left + r.width / 2, y: r.top });
      setCopyTip({ reportId, ok });
      copyTipTimer.current = setTimeout(() => {
        setCopyTip(null);
        copyAnchorRef.current = null;
        copyTipTimer.current = null;
      }, 2000);
    },
    []
  );

  useLayoutEffect(() => {
    if (!copyTip) return;
    const el = copyAnchorRef.current;
    if (!el) return;

    const sync = () => {
      const r = el.getBoundingClientRect();
      setTipPos({ x: r.left + r.width / 2, y: r.top });
    };

    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [copyTip]);

  useEffect(() => {
    return () => {
      if (copyTipTimer.current) clearTimeout(copyTipTimer.current);
    };
  }, []);

  const copyShareLink = useCallback(
    async (shareDisplay: string, reportId: string, anchor: HTMLElement) => {
      const text = toAbsoluteShareUrl(shareDisplay);
      try {
        await navigator.clipboard.writeText(text);
        showCopyTip(reportId, true, anchor);
      } catch {
        showCopyTip(reportId, false, anchor);
      }
    },
    [showCopyTip]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }, []);

  async function executeDeleteFolder() {
    if (!folderToDelete) return;
    setFolderDeleteBusy(true);
    try {
      const res = await fetch(`/api/clients/${folderToDelete.clientId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 204) {
        throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
      }
      setFolderToDelete(null);
      setFolderView("root");
      setOpenClientKey(null);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      window.alert(msg);
    } finally {
      setFolderDeleteBusy(false);
    }
  }

  async function executeDeleteReport() {
    if (!reportToDelete) return;
    setReportDeleteBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportToDelete.reportId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 204) {
        throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
      }
      if (preview?.report.id === reportToDelete.reportId) {
        setPreview(null);
      }
      setReportToDelete(null);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      window.alert(msg);
    } finally {
      setReportDeleteBusy(false);
    }
  }

  const hasActiveFilters = Boolean(search.trim() || dateFrom.trim() || dateTo.trim());

  const linkClass =
    "font-medium text-[#1433be] underline-offset-2 hover:underline dark:text-[#a4b4ff]";
  const actionTextClass =
    "text-xs font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200";

  const openFolder = (key: string) => {
    setOpenClientKey(key);
    setFolderView("client");
  };

  const goToRoot = () => {
    setFolderView("root");
    setOpenClientKey(null);
  };

  const filterToolbar = (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Client, company, or task…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-600 dark:bg-surface"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Submitted from
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-600 dark:bg-surface"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Submitted to
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-600 dark:bg-surface"
          />
        </label>
        <div className="flex items-end gap-2 lg:justify-end">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-surface dark:text-zinc-200 dark:hover:bg-zinc-800 lg:w-auto"
            >
              Clear filters
            </button>
          ) : (
            <span className="hidden text-xs text-zinc-400 lg:block"> </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderReportTable = (list: SummaryRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-zinc-100 bg-white text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-surface/55">
          <tr>
            <th className="px-4 py-2.5 font-medium">Created</th>
            <th className="px-4 py-2.5 font-medium">By</th>
            <th className="px-4 py-2.5 font-medium">Title</th>
            <th className="px-4 py-2.5 font-medium">Worked / total</th>
            <th className="px-4 py-2.5 font-medium">Share</th>
            <th className="px-4 py-2.5 text-right font-medium"> </th>
          </tr>
        </thead>
        <tbody>
          {list.map(({ report: rep, client }) => {
            const shareDisplay = shareBase
              ? `${shareBase}/r/${rep.slug}`
              : `/r/${rep.slug}`;
            const worked = totalWorkedHours(rep.lineItems);
            const planned = totalPlannedHours(rep.lineItems);
            return (
              <tr
                key={rep.id}
                className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/80"
              >
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-xs text-zinc-600 dark:text-zinc-400">
                  {formatSummaryCreatedAt(rep.createdAt)}
                </td>
                <td className="max-w-[10rem] truncate px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {rep.createdByLabel?.trim() || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {rep.title}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatHours(worked)} / {formatHours(planned)} hrs
                </td>
                <td className="max-w-[14rem] px-4 py-3">
                  <span className="inline-block max-w-full align-middle">
                    <button
                      type="button"
                      onClick={(e) => {
                        const wrap = e.currentTarget.parentElement;
                        if (wrap) void copyShareLink(shareDisplay, rep.id, wrap);
                      }}
                      className={`max-w-full cursor-pointer truncate text-left font-mono text-xs ${linkClass}`}
                      title="Click to copy link"
                    >
                      {shareDisplay}
                    </button>
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPreview({ report: rep, client })}
                      className={actionTextClass}
                    >
                      View
                    </button>
                    <Link href={`/reports/${rep.id}`} className={actionTextClass}>
                      Edit
                    </Link>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReportToDelete({ reportId: rep.id, title: rep.title })
                        }
                        className={actionTextClass}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-surface">
        <p className="px-4 py-10 text-center text-sm text-zinc-500">
          No summaries yet. Create one to get a share link.
        </p>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={reportToDelete !== null}
        title="Delete summary?"
        description={
          reportToDelete
            ? `This permanently deletes “${reportToDelete.title}” and its share link. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete summary"
        cancelLabel="Cancel"
        variant="danger"
        busy={reportDeleteBusy}
        onCancel={() => !reportDeleteBusy && setReportToDelete(null)}
        onConfirm={() => void executeDeleteReport()}
      />
      <ConfirmDialog
        open={folderToDelete !== null}
        title="Delete client folder?"
        description={
          folderToDelete
            ? `This permanently deletes “${folderToDelete.label}” and all ${folderToDelete.count} ${
                folderToDelete.count === 1 ? "summary" : "summaries"
              } in this folder. Share links will stop working. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete folder"
        cancelLabel="Cancel"
        variant="danger"
        busy={folderDeleteBusy}
        onCancel={() => !folderDeleteBusy && setFolderToDelete(null)}
        onConfirm={() => void executeDeleteFolder()}
      />

      {filterToolbar}

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-surface">
        {folderView === "root" ? (
          <>
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Clients
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Open a folder to see summaries. Use search and dates to narrow the list.
              </p>
            </div>
            {groups.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-zinc-500">
                No summaries match your filters. Try adjusting search or dates.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {groups.map((group) => {
                  const latest = group.rows[0]?.report.createdAt;
                  const canDeleteFolder = isAdmin && group.key !== "__none__";
                  return (
                    <li
                      key={group.key}
                      className="flex items-stretch gap-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <button
                        type="button"
                        onClick={() => openFolder(group.key)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left"
                      >
                        <span
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-brand dark:border-zinc-600 dark:bg-zinc-800 dark:text-brand-on-dark"
                          aria-hidden
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.75}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                            {group.label}
                          </span>
                          {group.subtitle ? (
                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {group.subtitle}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                            {group.rows.length}{" "}
                            {group.rows.length === 1 ? "summary" : "summaries"}
                            {latest ? ` · latest ${formatSummaryCreatedAt(latest)}` : null}
                          </span>
                        </span>
                        <svg
                          className="h-5 w-5 shrink-0 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {canDeleteFolder ? (
                        <div className="flex shrink-0 items-center pr-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFolderToDelete({
                                clientId: group.key,
                                label: group.label,
                                count: group.rows.length,
                              });
                            }}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete folder
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-3 dark:border-zinc-800 sm:px-4">
              <button
                type="button"
                onClick={goToRoot}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-surface dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All clients
              </button>
              <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                /
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {openGroup?.label ?? "…"}
              </span>
              {openGroup?.subtitle ? (
                <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                  ({openGroup.subtitle})
                </span>
              ) : null}
            </div>
            {openGroup ? renderReportTable(openGroup.rows) : null}
          </>
        )}
      </div>

      <ReportPreviewDialog
        report={preview?.report ?? null}
        client={preview?.client ?? null}
        shareBase={shareBase}
        onClose={() => setPreview(null)}
      />

      {copyTip && typeof document !== "undefined"
        ? createPortal(
            <div
              role="status"
              className="pointer-events-none fixed z-[9999]"
              style={{
                left: tipPos.x,
                top: tipPos.y,
                transform: "translate(-50%, calc(-100% - 6px))",
              }}
            >
              <div className="relative inline-block whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
                {copyTip.ok ? "Link copied" : "Could not copy"}
                <span
                  className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-zinc-900 dark:border-t-zinc-100"
                  aria-hidden
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
