import {
  getFolders,
  getFolderlessLists,
  getSpaces,
} from "@/lib/clickup/client";
import type { ClickUpTeam } from "@/lib/clickup/client";

const MAX_SPACES = 80;
const MAX_FOLDERS = 120;

export type WorkspaceFolderOption =
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

/**
 * Flat folder locations for one workspace (team), same shape as company/channel pick:
 * each row is either a folder (Space → Folder) or a list not in a folder (Space → List).
 */
export async function buildWorkspaceFolderOptions(
  token: string,
  team: ClickUpTeam
): Promise<WorkspaceFolderOption[]> {
  const options: WorkspaceFolderOption[] = [];
  const spaces = (await getSpaces(token, team.id)).slice(0, MAX_SPACES);
  for (const space of spaces) {
    const folders = (await getFolders(token, space.id)).slice(0, MAX_FOLDERS);
    for (const folder of folders) {
      options.push({
        kind: "folder",
        key: `folder:${folder.id}`,
        label: `${space.name} → ${folder.name}`,
        teamId: team.id,
        spaceId: space.id,
        folderId: folder.id,
      });
    }
    const folderless = await getFolderlessLists(token, space.id);
    for (const list of folderless) {
      options.push({
        kind: "space_list",
        key: `list:${list.id}`,
        label: `${space.name} → ${list.name}`,
        listName: list.name,
        teamId: team.id,
        spaceId: space.id,
        listId: list.id,
      });
    }
  }
  options.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
  return options;
}
