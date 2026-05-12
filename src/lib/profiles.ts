import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type AppRole = "admin" | "member";

export type UserProfile = {
  role: AppRole;
  fullName: string;
};

function isProfilesMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("profiles") &&
    (m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("could not find"))
  );
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (isProfilesMissingError(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const role = data.role === "admin" ? "admin" : "member";
  return { role, fullName: String(data.full_name ?? "") };
}

/**
 * Admins manage integrations and team. If `profiles` is not migrated yet, everyone is treated as admin.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    const sb = createSupabaseAdmin();
    const probe = await sb.from("profiles").select("id").limit(1);
    if (probe.error && isProfilesMissingError(probe.error.message)) {
      return true;
    }
    return false;
  }
  return profile.role === "admin";
}

export function creatorLabelFromUser(user: {
  email?: string | null;
}): string {
  const e = user.email?.trim();
  return e || "Team member";
}

/** Label stored on reports / shown on summaries — prefers profile name, then email. */
export function creatorDisplayLabel(
  user: { email?: string | null },
  profile: UserProfile | null
): string {
  const name = profile?.fullName?.trim();
  if (name) return name;
  return creatorLabelFromUser(user);
}
