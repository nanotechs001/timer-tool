import { NextResponse } from "next/server";
import { guardAdminRequest } from "@/lib/api-guard";
import { getTasksInList } from "@/lib/clickup/client";
import { getClickUpAccessToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const listId = new URL(req.url).searchParams.get("listId");
  if (!listId) {
    return NextResponse.json({ error: "Missing listId" }, { status: 400 });
  }
  const token = await getClickUpAccessToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "ClickUp not connected" }, { status: 400 });
  }
  try {
    const tasks = await getTasksInList(token, listId);
    return Response.json({ tasks });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
