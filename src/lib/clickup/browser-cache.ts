/**
 * In-memory cache for ClickUp JSON fetches (client-only).
 * Survives client-side navigations; a full browser reload clears it so data can refresh.
 */

const store = new Map<string, unknown>();

export function readClickUpCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function writeClickUpCache(key: string, value: unknown): void {
  store.set(key, value);
}

/** Sentinel: lists live directly under the space (not inside a folder). */
export const CU_SPACE_LISTS_ROOT = "__cu_space_lists__";

export function cacheKeyFolders(spaceId: string): string {
  return `clickup:folders:${spaceId}`;
}

export function cacheKeyLists(spaceId: string, folderIdForApi: string): string {
  return `clickup:lists:${spaceId}:${folderIdForApi || "_root"}`;
}

export function cacheKeySpaces(teamId: string): string {
  return `clickup:spaces:${teamId}`;
}

/** Single key for the signed-in user’s workspace list. */
export const CACHE_KEY_CLICKUP_TEAMS = "clickup:teams";

export function cacheKeyWorkspaceFolderOptions(teamId: string): string {
  return `clickup:workspace-folder-options:${teamId}`;
}
