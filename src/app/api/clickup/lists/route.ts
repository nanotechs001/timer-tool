import { NextResponse } from "next/server";
import { guardAuthenticatedRequest } from "@/lib/api-guard";
import {
  getFolderlessLists,
  getListsInFolder,
} from "@/lib/clickup/client";
import type { ClickUpList } from "@/lib/clickup/client";
import { getEffectiveClickUpToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const denied = await guardAuthenticatedRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get("spaceId");
  const folderId = searchParams.get("folderId")?.trim() ?? "";
  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId" }, { status: 400 });
  }
  const token = await getEffectiveClickUpToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "ClickUp not connected" }, { status: 400 });
  }
  try {
    let lists: ClickUpList[];
    if (folderId) {
      const raw = await getListsInFolder(token, folderId);
      lists = raw.map((l) => ({
        ...l,
        spaceId,
        folderId,
      }));
    } else {
      const raw = await getFolderlessLists(token, spaceId);
      lists = raw.map((l) => ({
        ...l,
        spaceId,
      }));
    }
    return Response.json({ lists });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
