import { z } from "zod";
import {
  guardAdminOnlyRequest,
  jsonError,
  jsonValidation,
} from "@/lib/api-guard";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();

const patchSchema = z.object({
  role: z.enum(["admin", "member"]),
});

async function countAdmins(
  sb: ReturnType<typeof createSupabaseAdmin>
): Promise<number> {
  const { data, error } = await sb.from("profiles").select("id").eq("role", "admin");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await guardAdminOnlyRequest();
  if (denied) return denied;
  const session = await getSessionUser();
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidation(parsed.error.flatten());
  }
  const sb = createSupabaseAdmin();
  const { data: prof, error: pErr } = await sb
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();
  if (pErr) return jsonError(pErr.message, 500);
  if (!prof) return jsonError("User profile not found", 404);
  const wasAdmin = (prof as { role: string }).role === "admin";
  const willBeAdmin = parsed.data.role === "admin";
  if (wasAdmin && !willBeAdmin) {
    try {
      const n = await countAdmins(sb);
      if (n <= 1) return jsonError("Cannot remove the last admin", 400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not verify admins";
      return jsonError(msg, 500);
    }
  }
  if (session?.id === id && wasAdmin && !willBeAdmin) {
    try {
      const n = await countAdmins(sb);
      if (n <= 1) {
        return jsonError("Cannot demote yourself as the only admin", 400);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not verify admins";
      return jsonError(msg, 500);
    }
  }
  const { error } = await sb
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", id);
  if (error) return jsonError(error.message, 500);
  return Response.json({ ok: true as const });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await guardAdminOnlyRequest();
  if (denied) return denied;
  const session = await getSessionUser();
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  if (session?.id === id) {
    return jsonError("You cannot remove your own account from here", 400);
  }
  const sb = createSupabaseAdmin();
  const { data: prof } = await sb
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();
  if ((prof as { role: string } | null)?.role === "admin") {
    try {
      const n = await countAdmins(sb);
      if (n <= 1) return jsonError("Cannot delete the last admin", 400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not verify admins";
      return jsonError(msg, 500);
    }
  }
  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) return jsonError(error.message, 400);
  return new Response(null, { status: 204 });
}
