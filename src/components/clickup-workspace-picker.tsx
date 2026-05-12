"use client";

/* Chained dropdowns: reset dependent state when parent selection changes; fetches are async. */
/* eslint-disable react-hooks/set-state-in-effect -- intentional cascading data loads */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClickUpList, ClickUpTask, ClickUpTeam } from "@/lib/clickup/client";
import { InlineSpinner } from "@/components/inline-spinner";
import {
  CACHE_KEY_CLICKUP_TEAMS,
  cacheKeyLists,
  cacheKeyTaskDetail,
  cacheKeyTasks,
  cacheKeyWorkspaceFolderOptions,
  clearAllClickUpCache,
  readClickUpCache,
  writeClickUpCache,
} from "@/lib/clickup/browser-cache";

type Status = { connected: boolean; oauthConfigured: boolean };

export type ClickUpInitialSelection = {
  teamId: string;
  spaceId: string;
  folderId: string;
  listId: string;
};

/** Matches `/api/clickup/workspace-folder-options` JSON (same idea as company/channel rows). */
type FolderLocationOption =
  | {
      kind: "folder";
      key: string;
      label: string;
      teamId: string;
      spaceId: string;
      folderId: string;
    }
  | {
      kind: "space_list";
      key: string;
      label: string;
      listName: string;
      teamId: string;
      spaceId: string;
      listId: string;
    };

type Props = {
  /** `hoursWorked` defaults to `hoursTotal` when omitted (same as ClickUp tracked time for both columns until you edit the row). */
  onAddFromClickUp?: (task: string, hoursTotal: number, hoursWorked?: number) => void;
  /** When the summary’s client is linked to ClickUp, open this path by default. */
  initialClickUp?: ClickUpInitialSelection | null;
};

export function ClickUpWorkspacePicker({
  onAddFromClickUp,
  initialClickUp,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [teams, setTeams] = useState<ClickUpTeam[]>([]);
  const [folderOptions, setFolderOptions] = useState<FolderLocationOption[]>([]);
  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [teamId, setTeamId] = useState(initialClickUp?.teamId ?? "");
  const [locationKey, setLocationKey] = useState("");
  const [listId, setListId] = useState("");
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [taskId, setTaskId] = useState("");
  const [importHours, setImportHours] = useState<number>(0);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingFolderOptions, setLoadingFolderOptions] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingTaskDetail, setLoadingTaskDetail] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** Bumped with Sync to bypass cache and refetch. */
  const [dataRevision, setDataRevision] = useState(0);
  const initAppliedRef = useRef(false);
  const prevListIdRef = useRef<string | undefined>(undefined);

  const showImport = Boolean(onAddFromClickUp);
  const anyLoading =
    loadingTeams ||
    loadingFolderOptions ||
    loadingLists ||
    loadingTasks ||
    loadingTaskDetail;

  const selectedLocation = useMemo(
    () => folderOptions.find((o) => o.key === locationKey),
    [folderOptions, locationKey]
  );

  const handleSyncClickUp = useCallback(() => {
    clearAllClickUpCache();
    setDataRevision((n) => n + 1);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/clickup/status", { credentials: "include" });
      const data = (await res.json()) as Status;
      setStatus(data);
    } catch {
      setStatus({ connected: false, oauthConfigured: false });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.connected) {
      setTeams([]);
      setFolderOptions([]);
      setLists([]);
      setTeamId("");
      setLocationKey("");
      setListId("");
      setTasks([]);
      setTaskId("");
      setImportHours(0);
      initAppliedRef.current = false;
      return;
    }
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setErr(null);
      const cached = readClickUpCache<{ teams: ClickUpTeam[] }>(CACHE_KEY_CLICKUP_TEAMS);
      if (cached && Array.isArray(cached.teams)) {
        setTeams(cached.teams);
        return;
      }
      setLoadingTeams(true);
      try {
        const res = await fetch("/api/clickup/teams", {
          credentials: "include",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load workspaces");
        if (cancelled) return;
        const next = (data.teams ?? []) as ClickUpTeam[];
        setTeams(next);
        writeClickUpCache(CACHE_KEY_CLICKUP_TEAMS, { teams: next });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [status?.connected, dataRevision]);

  useEffect(() => {
    if (!teamId || !status?.connected) {
      setFolderOptions([]);
      setLocationKey("");
      setLists([]);
      setListId("");
      setTasks([]);
      setTaskId("");
      return;
    }
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const cacheKey = cacheKeyWorkspaceFolderOptions(teamId);
        const cached = readClickUpCache<{ options: FolderLocationOption[] }>(cacheKey);
        if (cached && Array.isArray(cached.options)) {
          if (cancelled) return;
          setFolderOptions(cached.options);
          return;
        }
        setLoadingFolderOptions(true);
        const res = await fetch(
          `/api/clickup/workspace-folder-options?teamId=${encodeURIComponent(teamId)}`,
          { credentials: "include", signal: ac.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load folders");
        if (cancelled) return;
        const next = (data.options ?? []) as FolderLocationOption[];
        setFolderOptions(next);
        writeClickUpCache(cacheKey, { options: next });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoadingFolderOptions(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [teamId, status?.connected, dataRevision]);

  useEffect(() => {
    if (!teamId || folderOptions.length === 0) return;
    if (initialClickUp?.teamId !== teamId) return;
    if (initAppliedRef.current) return;
    const initFolder = (initialClickUp.folderId ?? "").trim();
    const initList = (initialClickUp.listId ?? "").trim();
    const initSpace = (initialClickUp.spaceId ?? "").trim();
    let key: string | null = null;
    if (initFolder) {
      const o = folderOptions.find(
        (x) =>
          x.kind === "folder" &&
          x.folderId === initFolder &&
          (!initSpace || x.spaceId === initSpace)
      );
      if (o) key = o.key;
    } else if (initList) {
      const o = folderOptions.find(
        (x) =>
          x.kind === "space_list" &&
          x.listId === initList &&
          (!initSpace || x.spaceId === initSpace)
      );
      if (o) key = o.key;
    }
    if (key) setLocationKey(key);
    initAppliedRef.current = true;
  }, [teamId, folderOptions, initialClickUp]);

  useEffect(() => {
    if (!selectedLocation || !status?.connected) {
      setLists([]);
      setListId("");
      setLoadingLists(false);
      return;
    }

    if (selectedLocation.kind === "space_list") {
      setLoadingLists(false);
      setLists([
        {
          id: selectedLocation.listId,
          name: selectedLocation.listName,
          spaceId: selectedLocation.spaceId,
        },
      ]);
      setListId(selectedLocation.listId);
      return;
    }

    const { spaceId, folderId } = selectedLocation;
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const cacheKey = cacheKeyLists(spaceId, folderId);
        const cached = readClickUpCache<{ lists: ClickUpList[] }>(cacheKey);
        if (cached && Array.isArray(cached.lists)) {
          if (cancelled) return;
          setLists(cached.lists);
          return;
        }
        setLoadingLists(true);
        const q = new URLSearchParams({ spaceId, folderId });
        const res = await fetch(`/api/clickup/lists?${q}`, {
          credentials: "include",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load lists");
        if (cancelled) return;
        const nextLists = (data.lists ?? []) as ClickUpList[];
        writeClickUpCache(cacheKey, { lists: nextLists });
        setLists(nextLists);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedLocation, status?.connected, dataRevision]);

  useEffect(() => {
    if (!selectedLocation || selectedLocation.kind !== "folder") return;
    if (!initialClickUp || initialClickUp.teamId !== teamId) return;
    const want = (initialClickUp.listId ?? "").trim();
    if (!want || !lists.some((l) => l.id === want)) return;
    setListId((prev) => (prev === want ? prev : want));
  }, [lists, selectedLocation, initialClickUp, teamId]);

  useEffect(() => {
    if (!listId) return;
    if (!lists.some((l) => l.id === listId)) {
      setListId("");
      setTasks([]);
      setTaskId("");
      setImportHours(0);
    }
  }, [lists, listId]);

  useEffect(() => {
    if (prevListIdRef.current === listId) return;
    prevListIdRef.current = listId;
    setTaskId("");
    setImportHours(0);
  }, [listId]);

  useEffect(() => {
    if (!showImport || !listId || !status?.connected) {
      setTasks([]);
      setTaskId("");
      setImportHours(0);
      return;
    }
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const cacheKey = cacheKeyTasks(listId);
        const cached = readClickUpCache<{ tasks: ClickUpTask[] }>(cacheKey);
        if (cached && Array.isArray(cached.tasks)) {
          if (cancelled) return;
          setTasks(cached.tasks);
          return;
        }
        setLoadingTasks(true);
        const res = await fetch(
          `/api/clickup/tasks?listId=${encodeURIComponent(listId)}`,
          { credentials: "include", signal: ac.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load tasks");
        if (cancelled) return;
        const next = (data.tasks ?? []) as ClickUpTask[];
        writeClickUpCache(cacheKey, { tasks: next });
        setTasks(next);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoadingTasks(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [listId, showImport, status?.connected, dataRevision]);

  useEffect(() => {
    if (!showImport || !taskId || !status?.connected) {
      setImportHours(0);
      return;
    }
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const cacheKey = cacheKeyTaskDetail(taskId);
        const cached = readClickUpCache<{ hoursFromClickUp: number }>(cacheKey);
        if (
          cached &&
          typeof cached.hoursFromClickUp === "number" &&
          Number.isFinite(cached.hoursFromClickUp)
        ) {
          if (cancelled) return;
          setImportHours(cached.hoursFromClickUp);
          return;
        }
        setLoadingTaskDetail(true);
        const res = await fetch(
          `/api/clickup/task?taskId=${encodeURIComponent(taskId)}`,
          { credentials: "include", signal: ac.signal }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load task");
        if (cancelled) return;
        const h = Number(data.hoursFromClickUp);
        const hours = Number.isFinite(h) ? h : 0;
        setImportHours(hours);
        writeClickUpCache(cacheKey, { hoursFromClickUp: hours });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
        if (!cancelled) setImportHours(0);
      } finally {
        if (!cancelled) setLoadingTaskDetail(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [taskId, showImport, status?.connected, dataRevision]);

  if (!status?.connected) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Connect ClickUp under{" "}
        <a href="/settings/integrations" className="text-brand underline dark:text-brand-on-dark">
          Integrations
        </a>{" "}
        (OAuth or personal token) to import tasks here.
      </p>
    );
  }

  const selectedTask = tasks.find((t) => t.id === taskId);

  function applyRow() {
    if (!onAddFromClickUp || !selectedTask) return;
    onAddFromClickUp(selectedTask.name, importHours);
    setTaskId("");
    setImportHours(0);
  }

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-zinc-700 dark:text-zinc-200">ClickUp (read-only)</p>
        <button
          type="button"
          onClick={handleSyncClickUp}
          disabled={anyLoading}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Sync
        </button>
        {anyLoading ? <InlineSpinner label="Fetching…" /> : null}
      </div>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
        Workspace, folders, lists, and tasks are cached while you work. Use <strong className="font-medium">Sync</strong>{" "}
        to reload everything from ClickUp.
      </p>
      {initialClickUp?.teamId ? (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Opened to match <strong className="font-medium text-zinc-600 dark:text-zinc-300">this summary’s client</strong>{" "}
          when they’re linked from the Clients page. Change workspace or folder if needed.
        </p>
      ) : null}
      {err ? <p className="text-red-600 dark:text-red-400">{err}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
            1 · Workspace
            {loadingTeams ? <InlineSpinner className="scale-90" /> : null}
          </span>
          <select
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-surface"
            value={teamId}
            onChange={(e) => {
              initAppliedRef.current = false;
              setTeamId(e.target.value);
              setLocationKey("");
              setLists([]);
              setListId("");
            }}
            disabled={loadingTeams || teams.length === 0}
          >
            <option value="">{loadingTeams ? "Loading…" : "Select workspace…"}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
            2 · Folder
            {loadingFolderOptions ? <InlineSpinner className="scale-90" /> : null}
          </span>
          <select
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-surface"
            value={locationKey}
            onChange={(e) => {
              setLocationKey(e.target.value);
              setListId("");
              setLists([]);
            }}
            disabled={!teamId || loadingFolderOptions || folderOptions.length === 0}
          >
            <option value="">
              {!teamId
                ? "Select workspace first…"
                : loadingFolderOptions
                  ? "Loading folders…"
                  : folderOptions.length === 0
                    ? "No folders or lists in this workspace"
                    : "Select folder…"}
            </option>
            {folderOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
            3 · List
            {loadingLists ? <InlineSpinner className="scale-90" /> : null}
          </span>
          <select
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-surface"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            disabled={!selectedLocation || loadingLists || lists.length === 0}
          >
            <option value="">
              {!selectedLocation
                ? "Select a folder first…"
                : loadingLists
                  ? "Loading lists…"
                  : lists.length === 0
                    ? "No lists in this folder"
                    : "Select list…"}
            </option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            Choose the list that contains the task you want on the invoice line.
          </p>
        </label>

        {showImport ? (
          <>
            <label className="block sm:col-span-2">
              <span className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                4 · Task
                {loadingTasks ? (
                  <InlineSpinner className="scale-90" label="Loading tasks…" />
                ) : null}
              </span>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-surface"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!listId || loadingTasks}
              >
                <option value="">
                  {loadingTasks ? "Loading tasks…" : "Select task…"}
                </option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                5 · Hours
                {loadingTaskDetail ? (
                  <InlineSpinner className="scale-90" label="Loading tracked time…" />
                ) : null}
              </span>
              <input
                type="number"
                min={0}
                step={0.25}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-surface"
                value={importHours}
                onChange={(e) => setImportHours(Number(e.target.value) || 0)}
                disabled={!taskId || loadingTaskDetail}
              />
              <p className="mt-1 text-[10px] text-zinc-500">
                Pulled from ClickUp tracked time when available; you can edit before adding the row.
              </p>
            </label>
          </>
        ) : null}
      </div>
      {showImport && selectedTask ? (
        <button
          type="button"
          disabled={loadingTaskDetail}
          onClick={applyRow}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Add row from this task
        </button>
      ) : null}
    </div>
  );
}
