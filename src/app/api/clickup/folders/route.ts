import { NextResponse } from "next/server";
import { guardAdminRequest } from "@/lib/api-guard";
import { getFolders } from "@/lib/clickup/client";
import { getClickUpAccessToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const spaceId = new URL(req.url).searchParams.get("spaceId");
  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId" }, { status: 400 });
  }
  const token = await getClickUpAccessToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "ClickUp not connected" }, { status: 400 });
  }
  try {
    const folders = await getFolders(token, spaceId);
    return Response.json({ folders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
