import { z } from "zod";
import {
  guardAdminRequest,
  jsonError,
} from "@/lib/api-guard";
import { getAuthorizedTeams } from "@/lib/clickup/client";
import { saveClickUpAccessToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  token: z.string().trim().min(20),
});

export async function POST(req: Request) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return jsonError("Unauthorized", 401);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Paste your full ClickUp personal API token.", 400);
  }

  const token = parsed.data.token;
  if (!token.startsWith("pk_")) {
    return jsonError(
      "ClickUp personal API tokens start with pk_. Copy it from ClickUp → Settings → Apps, or use “Connect with ClickUp” if OAuth is configured on the server.",
      400
    );
  }

  try {
    await getAuthorizedTeams(token);
  } catch {
    return jsonError(
      "ClickUp rejected this token. Regenerate it in ClickUp → Settings → Apps and try again.",
      401
    );
  }

  try {
    await saveClickUpAccessToken(user.id, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save token";
    return jsonError(msg, 500);
  }

  return Response.json({ ok: true });
}
