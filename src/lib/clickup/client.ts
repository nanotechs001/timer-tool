const API = "https://api.clickup.com/api/v2";

/** Personal tokens use `Authorization: pk_…`; OAuth uses `Bearer …`. */
export function clickUpAuthorizationValue(token: string): string {
  const t = token.trim();
  if (t.startsWith("pk_")) return t;
  return `Bearer ${t}`;
}

export type ClickUpTeam = { id: string; name: string };
export type ClickUpSpace = { id: string; name: string };
export type ClickUpList = {
  id: string;
  name: string;
  spaceId: string;
  folderId?: string;
  folderName?: string;
};
export type ClickUpTask = { id: string; name: string; url: string };

async function cuGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: clickUpAuthorizationValue(token) },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ClickUp ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function getAuthorizedTeams(
  token: string
): Promise<ClickUpTeam[]> {
  const data = await cuGet<{ teams: unknown[] }>(`/team`, token);
  const teams = data.teams ?? [];
  return teams.map((t) => {
    const o = t as Record<string, unknown>;
    return {
      id: String(o.id ?? ""),
      name: String(o.name ?? "Workspace"),
    };
  });
}

export async function getSpaces(
  token: string,
  teamId: string
): Promise<ClickUpSpace[]> {
  const data = await cuGet<{ spaces: unknown[] }>(
    `/team/${encodeURIComponent(teamId)}/space?archived=false`,
    token
  );
  const spaces = data.spaces ?? [];
  return spaces.map((s) => {
    const o = s as Record<string, unknown>;
    return { id: String(o.id ?? ""), name: String(o.name ?? "Space") };
  });
}

export async function getFolderlessLists(
  token: string,
  spaceId: string
): Promise<Pick<ClickUpList, "id" | "name">[]> {
  const data = await cuGet<{ lists: unknown[] }>(
    `/space/${encodeURIComponent(spaceId)}/list?archived=false`,
    token
  );
  const lists = data.lists ?? [];
  return lists.map((l) => {
    const o = l as Record<string, unknown>;
    return { id: String(o.id ?? ""), name: String(o.name ?? "List") };
  });
}

export async function getFolders(
  token: string,
  spaceId: string
): Promise<{ id: string; name: string }[]> {
  const data = await cuGet<{ folders: unknown[] }>(
    `/space/${encodeURIComponent(spaceId)}/folder?archived=false`,
    token
  );
  const folders = data.folders ?? [];
  return folders.map((f) => {
    const o = f as Record<string, unknown>;
    return { id: String(o.id ?? ""), name: String(o.name ?? "Folder") };
  });
}

export async function getListsInFolder(
  token: string,
  folderId: string
): Promise<Pick<ClickUpList, "id" | "name">[]> {
  const data = await cuGet<{ lists: unknown[] }>(
    `/folder/${encodeURIComponent(folderId)}/list?archived=false`,
    token
  );
  const lists = data.lists ?? [];
  return lists.map((l) => {
    const o = l as Record<string, unknown>;
    return { id: String(o.id ?? ""), name: String(o.name ?? "List") };
  });
}

/** Lists in a space: folderless lists plus lists inside each folder. */
export async function getAllListsInSpace(
  token: string,
  spaceId: string
): Promise<ClickUpList[]> {
  const out: ClickUpList[] = [];
  const folderless = await getFolderlessLists(token, spaceId);
  for (const l of folderless) {
    out.push({ ...l, spaceId });
  }
  const folders = await getFolders(token, spaceId);
  for (const folder of folders) {
    const inner = await getListsInFolder(token, folder.id);
    for (const l of inner) {
      out.push({
        ...l,
        spaceId,
        folderId: folder.id,
        folderName: folder.name,
      });
    }
  }
  return out;
}

export function taskWebUrl(taskId: string): string {
  return `https://app.clickup.com/t/${taskId}`;
}

/** Single-task fetch; `time_spent` is tracked time in milliseconds when present. */
export async function getTaskTrackedHours(
  token: string,
  taskId: string
): Promise<{ name: string; hours: number }> {
  const data = (await cuGet<Record<string, unknown>>(
    `/task/${encodeURIComponent(taskId)}`,
    token
  )) as Record<string, unknown>;
  const name = String(data.name ?? "Task");
  const raw = data.time_spent;
  let ms = 0;
  if (typeof raw === "number" && !Number.isNaN(raw)) ms = raw;
  else if (typeof raw === "string") ms = parseInt(raw, 10) || 0;
  const hours = Math.round((ms / 1000 / 3600) * 100) / 100;
  return { name, hours };
}

export async function getTasksInList(
  token: string,
  listId: string,
  maxPages = 5
): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  for (let page = 0; page < maxPages; page++) {
    const data = await cuGet<{ tasks: unknown[] }>(
      `/list/${encodeURIComponent(listId)}/task?archived=false&include_closed=true&page=${page}`,
      token
    );
    const batch = data.tasks ?? [];
    if (batch.length === 0) break;
    for (const t of batch) {
      const o = t as Record<string, unknown>;
      const id = String(o.id ?? "");
      const name = String(o.name ?? "Task");
      const direct =
        typeof o.url === "string" && o.url.startsWith("http") ? o.url : null;
      if (id) tasks.push({ id, name, url: direct ?? taskWebUrl(id) });
    }
    if (batch.length < 100) break;
  }
  return tasks;
}
