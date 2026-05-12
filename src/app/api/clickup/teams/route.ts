import { NextResponse } from "next/server";
import { guardAuthenticatedRequest } from "@/lib/api-guard";
import { getAuthorizedTeams } from "@/lib/clickup/client";
import { getEffectiveClickUpToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const denied = await guardAuthenticatedRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getEffectiveClickUpToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "ClickUp not connected" }, { status: 400 });
  }
  try {
    const teams = await getAuthorizedTeams(token);
    return Response.json({ teams });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
