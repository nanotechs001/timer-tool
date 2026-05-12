import { z } from "zod";
import {
  guardAdminOnlyRequest,
  jsonError,
  jsonValidation,
} from "@/lib/api-guard";
import type { AppRole } from "@/lib/profiles";
import { authCallbackUrl } from "@/lib/site-url";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const postSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member"]),
});

export async function GET() {
  const denied = await guardAdminOnlyRequest();
  if (denied) return denied;
  const sb = createSupabaseAdmin();
  const { data: pageData, error } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) return jsonError(error.message, 500);
  const users = pageData?.users ?? [];
  const ids = users.map((u) => u.id);
  const profById = new Map<
    string,
    { id: string; role: string; full_name: string | null }
  >();
  if (ids.length > 0) {
    const { data: profs, error: profErr } = await sb
      .from("profiles")
      .select("id, role, full_name")
      .in("id", ids);
    if (profErr) return jsonError(profErr.message, 500);
    for (const p of profs ?? []) {
      const row = p as { id: string; role: string; full_name: string | null };
      profById.set(row.id, row);
    }
  }
  const rows = users.map((u) => {
    const p = profById.get(u.id);
    const role: AppRole = p?.role === "admin" ? "admin" : "member";
    return {
      id: u.id,
      email: u.email ?? null,
      role,
      fullName: p?.full_name != null ? String(p.full_name) : "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    };
  });
  return Response.json({ users: rows });
}

export async function POST(req: Request) {
  const denied = await guardAdminOnlyRequest();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidation(parsed.error.flatten());
  }
  const { email, role } = parsed.data;
  const sb = createSupabaseAdmin();
  const redirectTo = authCallbackUrl(req);
  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
    data: { app_role: role },
    redirectTo,
  });
  if (error) {
    return jsonError(error.message, 400);
  }
  return Response.json({ ok: true as const, userId: data.user?.id ?? null });
}
