import { createSupabaseAdmin } from "@/lib/supabase/admin";

const TABLE = "clickup_connections";

/** PostgREST / Supabase when the table was never created in this project. */
export function isClickUpTableMissingMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("clickup_connections") ||
    (m.includes("could not find") && m.includes("schema cache")) ||
    (m.includes("relation") && m.includes("does not exist"))
  );
}

/** Returns false if `clickup_connections` is not in the DB (run migration SQL). */
export async function isClickUpTableAvailable(): Promise<boolean> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from(TABLE).select("user_id").limit(1);
  if (!error) return true;
  if (isClickUpTableMissingMessage(error.message)) return false;
  throw new Error(error.message);
}

export async function saveClickUpAccessToken(
  userId: string,
  accessToken: string
): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from(TABLE).upsert(
    {
      user_id: userId,
      access_token: accessToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    if (isClickUpTableMissingMessage(error.message)) {
      throw new Error(
        "Supabase is missing table public.clickup_connections. Open supabase/schema.sql (or supabase/migrate-clickup-connections.sql) and run the ClickUp block in the SQL Editor."
      );
    }
    throw new Error(error.message);
  }
}

export async function getClickUpAccessToken(
  userId: string
): Promise<string | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from(TABLE)
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isClickUpTableMissingMessage(error.message)) return null;
    throw new Error(error.message);
  }
  const row = data as { access_token: string } | null;
  return row?.access_token ?? null;
}

/**
 * Uses this user’s token, or the first admin’s token (integrations are admin-only;
 * team members share the connected workspace).
 */
export async function getEffectiveClickUpToken(
  userId: string
): Promise<string | null> {
  const own = await getClickUpAccessToken(userId);
  if (own) return own;
  const sb = createSupabaseAdmin();
  const { data: admins, error } = await sb
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error) return null;
  for (const row of admins ?? []) {
    const id = String((row as { id: string }).id);
    const t = await getClickUpAccessToken(id);
    if (t) return t;
  }
  return null;
}

export async function deleteClickUpConnection(userId: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from(TABLE).delete().eq("user_id", userId);
  if (error) {
    if (isClickUpTableMissingMessage(error.message)) return;
    throw new Error(error.message);
  }
}
