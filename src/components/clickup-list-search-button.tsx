"use client";

/* eslint-disable react-hooks/set-state-in-effect -- load index when modal opens */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineSpinner } from "@/components/inline-spinner";
import {
  CACHE_KEY_ALL_CHANNELS,
  clearAllClickUpCache,
  readClickUpCache,
  writeClickUpCache,
} from "@/lib/clickup/browser-cache";

export type ClientLocationPick = {
  /** Folder or list title — used as the client name. */
  clientName: string;
  teamId: string;
  spaceId: string;
  folderId: string;
  listId: string;
  path: string;
};

type ChannelRow = ClientLocationPick & { key: string };

function asChannelRows(raw: unknown): ChannelRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean) as ChannelRow[];
}

type Props = {
  /** Fills client name and stores ClickUp ids for task import (after DB migration). */
  onPick: (pick: ClientLocationPick) => void;
  buttonClassName?: string;
};

export function ClickUpChannelSearchButton({
  onPick,
  buttonClassName = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const closeDialog = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setLoading(false);
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const cached = readClickUpCache<{ channels: ChannelRow[] }>(CACHE_KEY_ALL_CHANNELS);
    if (cached?.channels?.length) {
      setRows(asChannelRows(cached.channels));
      setErr(null);
      setLoading(false);
      try {
        const st = await fetch("/api/clickup/status", {
          credentials: "include",
          signal: ac.signal,
        });
        const stData = (await st.json()) as { connected?: boolean };
        const isConn = Boolean(stData.connected);
        setConnected(isConn);
        if (!isConn) setRows([]);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setConnected(false);
        setRows([]);
      }
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const st = await fetch("/api/clickup/status", {
        credentials: "include",
        signal: ac.signal,
      });
      const stData = (await st.json()) as { connected?: boolean };
      const isConn = Boolean(stData.connected);
      setConnected(isConn);
      if (!isConn) {
        setRows([]);
        return;
      }
      const res = await fetch("/api/clickup/all-channels", {
        credentials: "include",
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load locations");
      if (ac.signal.aborted) return;
      const ch = asChannelRows(data.channels);
      setRows(ch);
      writeClickUpCache(CACHE_KEY_ALL_CHANNELS, { channels: data.channels });
      setQuery("");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setErr(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  const syncFresh = useCallback(() => {
    clearAllClickUpCache();
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [open, load, reloadKey]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return rows.slice(0, 200);
    return rows
      .filter(
        (r) =>
          r.path.toLowerCase().includes(s) ||
          r.clientName.toLowerCase().includes(s)
      )
      .slice(0, 300);
  }, [rows, query]);

  function pick(row: ChannelRow) {
    onPick({
      clientName: row.clientName,
      teamId: row.teamId,
      spaceId: row.spaceId,
      folderId: row.folderId,
      listId: row.listId,
      path: row.path,
    });
    closeDialog();
    setQuery("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto sm:min-w-[12rem] ${buttonClassName}`}
      >
        Search ClickUp for client…
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close"
            onClick={closeDialog}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clickup-channel-search-title"
            className="relative z-[101] flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-surface sm:rounded-2xl"
          >
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-2">
                <h2
                  id="clickup-channel-search-title"
                  className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  Client from ClickUp
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => syncFresh()}
                    disabled={loading}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Sync
                  </button>
                  {loading ? <InlineSpinner label="Loading…" /> : null}
                </div>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Choose a <strong className="font-medium">folder</strong> or{" "}
                <strong className="font-medium">list</strong>. We fill <strong className="font-medium">Client</strong>{" "}
                and store the ClickUp path for task import (requires ClickUp columns on{" "}
                <code className="rounded bg-zinc-100 px-0.5 text-[10px] dark:bg-zinc-800">clients</code>).{" "}
                Locations stay cached while you work; use <strong className="font-medium">Sync</strong> for a fresh pull
                from ClickUp.
              </p>
              <input
                autoFocus
                type="search"
                placeholder="Filter by path or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 px-2 py-12">
                  <InlineSpinner />
                  <p className="text-sm text-zinc-500">Fetching folders and lists…</p>
                </div>
              ) : err ? (
                <p className="px-2 py-4 text-center text-sm text-red-600 dark:text-red-400">
                  {err}
                </p>
              ) : !connected ? (
                <p className="px-2 py-6 text-center text-sm text-zinc-500">
                  Connect ClickUp under{" "}
                  <a
                    href="/settings/integrations"
                    className="text-brand underline dark:text-brand-on-dark"
                  >
                    Integrations
                  </a>{" "}
                  first.
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-zinc-500">
                  {rows.length === 0 ? "No folders or lists found." : "No matches."}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filtered.map((r) => (
                    <li key={r.key}>
                      <button
                        type="button"
                        onClick={() => pick(r)}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {r.clientName}
                        </span>
                        <span className="text-xs text-zinc-500">{r.path}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={closeDialog}
                className="w-full rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
