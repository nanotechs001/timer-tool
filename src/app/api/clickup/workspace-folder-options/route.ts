import { NextResponse } from "next/server";
import { guardAuthenticatedRequest } from "@/lib/api-guard";
import { getAuthorizedTeams } from "@/lib/clickup/client";
import { buildWorkspaceFolderOptions } from "@/lib/clickup/workspace-folder-options";
import { getEffectiveClickUpToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = await guardAuthenticatedRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const teamId = new URL(req.url).searchParams.get("teamId")?.trim() ?? "";
  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }
  const token = await getEffectiveClickUpToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "ClickUp not connected" }, { status: 400 });
  }
  try {
    const teams = await getAuthorizedTeams(token);
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const options = await buildWorkspaceFolderOptions(token, team);
    return Response.json({ options });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
