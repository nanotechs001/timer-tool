import { guardAdminRequest } from "@/lib/api-guard";
import {
  getAuthorizedTeams,
  getFolderlessLists,
  getFolders,
  getListsInFolder,
  getSpaces,
} from "@/lib/clickup/client";
import { getClickUpAccessToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_TEAMS = 15;
const MAX_SPACES_PER_TEAM = 80;
const MAX_FOLDERS_PER_SPACE = 120;

/**
 * Pickable locations for linking a client to ClickUp.
 * Folders = client “containers”; lists inside = chat/task lists.
 * Folderless lists under a space are included as their own row (client name = list name).
 */
export type ClientLocationRow = {
  key: string;
  clientName: string;
  path: string;
  teamId: string;
  spaceId: string;
  folderId: string;
  listId: string;
};

export async function GET() {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getClickUpAccessToken(user.id);
  if (!token) {
    return Response.json({ error: "ClickUp not connected" }, { status: 400 });
  }

  const rows: ClientLocationRow[] = [];

  try {
    const teams = (await getAuthorizedTeams(token)).slice(0, MAX_TEAMS);
    for (const team of teams) {
      const spaces = (await getSpaces(token, team.id)).slice(0, MAX_SPACES_PER_TEAM);
      for (const space of spaces) {
        const folders = (await getFolders(token, space.id)).slice(0, MAX_FOLDERS_PER_SPACE);
        for (const folder of folders) {
          const lists = await getListsInFolder(token, folder.id);
          const first = lists[0];
          rows.push({
            key: `folder:${folder.id}`,
            clientName: folder.name,
            path: `${team.name} → ${space.name} → ${folder.name}`,
            teamId: team.id,
            spaceId: space.id,
            folderId: folder.id,
            listId: first?.id ?? "",
          });
        }

        const folderless = await getFolderlessLists(token, space.id);
        for (const list of folderless) {
          rows.push({
            key: `list:${list.id}`,
            clientName: list.name,
            path: `${team.name} → ${space.name} → ${list.name}`,
            teamId: team.id,
            spaceId: space.id,
            folderId: "",
            listId: list.id,
          });
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  rows.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));

  return Response.json({ channels: rows });
}
