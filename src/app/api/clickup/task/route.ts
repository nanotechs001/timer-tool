import { guardAuthenticatedRequest } from "@/lib/api-guard";
import { getTaskTrackedHours } from "@/lib/clickup/client";
import { getEffectiveClickUpToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const denied = await guardAuthenticatedRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) {
    return Response.json({ error: "Missing taskId" }, { status: 400 });
  }
  const token = await getEffectiveClickUpToken(user.id);
  if (!token) {
    return Response.json({ error: "ClickUp not connected" }, { status: 400 });
  }
  try {
    const { name, hours } = await getTaskTrackedHours(token, taskId);
    return Response.json({ name, hoursFromClickUp: hours });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ClickUp request failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
