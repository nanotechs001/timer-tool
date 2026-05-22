"use client";

import { useEffect } from "react";
import type { ClickUpList, ClickUpTask, ClickUpTeam } from "@/lib/clickup/client";
import type { ClickUpInitialSelection } from "@/components/clickup-workspace-picker";
import {
  CACHE_KEY_CLICKUP_TEAMS,
  cacheKeyLists,
  cacheKeyTasks,
  cacheKeyWorkspaceFolderOptions,
  readClickUpCache,
  writeClickUpCache,
} from "@/lib/clickup/browser-cache";

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
  initialClickUp?: ClickUpInitialSelection | null;
};

async function prefetchJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

export function ClickUpPreloader({ initialClickUp }: Props) {
  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      const status = await prefetchJson<{ connected: boolean }>("/api/clickup/status", ac.signal);
      if (!status?.connected || cancelled) return;

      if (!readClickUpCache<{ teams: ClickUpTeam[] }>(CACHE_KEY_CLICKUP_TEAMS)) {
        const teamsData = await prefetchJson<{ teams: ClickUpTeam[] }>("/api/clickup/teams", ac.signal);
        if (teamsData?.teams && !cancelled) {
          writeClickUpCache(CACHE_KEY_CLICKUP_TEAMS, { teams: teamsData.teams });
        }
      }

      const teamId = initialClickUp?.teamId?.trim() ?? "";
      if (!teamId) return;

      const optionsCacheKey = cacheKeyWorkspaceFolderOptions(teamId);
      let options =
        readClickUpCache<{ options: FolderLocationOption[] }>(optionsCacheKey)?.options ?? null;
      if (!options) {
        const optionsData = await prefetchJson<{ options: FolderLocationOption[] }>(
          `/api/clickup/workspace-folder-options?teamId=${encodeURIComponent(teamId)}`,
          ac.signal
        );
        if (!optionsData?.options || cancelled) return;
        options = optionsData.options;
        writeClickUpCache(optionsCacheKey, { options });
      }

      const initFolder = (initialClickUp?.folderId ?? "").trim();
      const initList = (initialClickUp?.listId ?? "").trim();
      const initSpace = (initialClickUp?.spaceId ?? "").trim();

      let selected: FolderLocationOption | undefined;
      if (initFolder) {
        selected = options.find(
          (o) =>
            o.kind === "folder" &&
            o.folderId === initFolder &&
            (!initSpace || o.spaceId === initSpace)
        );
      } else if (initList) {
        selected = options.find(
          (o) =>
            o.kind === "space_list" &&
            o.listId === initList &&
            (!initSpace || o.spaceId === initSpace)
        );
      }
      if (!selected || cancelled) return;

      let targetListId = "";
      if (selected.kind === "folder") {
        const listsCacheKey = cacheKeyLists(selected.spaceId, selected.folderId);
        let lists = readClickUpCache<{ lists: ClickUpList[] }>(listsCacheKey)?.lists ?? null;
        if (!lists) {
          const listsData = await prefetchJson<{ lists: ClickUpList[] }>(
            `/api/clickup/lists?spaceId=${encodeURIComponent(selected.spaceId)}&folderId=${encodeURIComponent(
              selected.folderId
            )}`,
            ac.signal
          );
          if (!listsData?.lists || cancelled) return;
          lists = listsData.lists;
          writeClickUpCache(listsCacheKey, { lists });
        }
        targetListId = initList && lists.some((l) => l.id === initList) ? initList : "";
      } else {
        targetListId = selected.listId;
      }

      if (!targetListId) return;
      const tasksCacheKey = cacheKeyTasks(targetListId);
      if (readClickUpCache<{ tasks: ClickUpTask[] }>(tasksCacheKey)) return;
      const tasksData = await prefetchJson<{ tasks: ClickUpTask[] }>(
        `/api/clickup/tasks?listId=${encodeURIComponent(targetListId)}`,
        ac.signal
      );
      if (tasksData?.tasks && !cancelled) {
        writeClickUpCache(tasksCacheKey, { tasks: tasksData.tasks });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [initialClickUp]);

  return null;
}
