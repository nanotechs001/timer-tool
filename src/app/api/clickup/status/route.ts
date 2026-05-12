import { guardAuthenticatedRequest } from "@/lib/api-guard";
import { isClickUpOAuthConfigured } from "@/lib/clickup/config";
import { getEffectiveClickUpToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * Must reflect a stored token (OAuth or personal pk_) — do not return connected: false
 * just because CLICKUP_CLIENT_* env vars are missing (personal-token users would break).
 */
export async function GET() {
  const denied = await guardAuthenticatedRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getEffectiveClickUpToken(user.id);
  return Response.json({
    connected: Boolean(token),
    oauthConfigured: isClickUpOAuthConfigured(),
  });
}
