import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/config";
import { jsonError, jsonValidation, supabaseNotConfiguredResponse } from "@/lib/api-guard";
import { passwordResetUrl } from "@/lib/site-url";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const postSchema = z.object({
  email: z.string().trim().email(),
});

async function findUserIdByEmail(email: string): Promise<string | null> {
  const sb = createSupabaseAdmin();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.trim().toLowerCase() === normalized);
    if (match?.id) return match.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) return supabaseNotConfiguredResponse();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return jsonValidation(parsed.error.flatten());
  const email = parsed.data.email.trim();
  try {
    const userId = await findUserIdByEmail(email);
    if (!userId) {
      return jsonError("No account found for this email.", 404);
    }
    const sb = createSupabaseAdmin();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetUrl(req),
    });
    if (error) return jsonError(error.message, 400);
    return Response.json({ ok: true as const });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not send password reset email", 500);
  }
}
