import { cache } from "react";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/profiles";
import { getSessionUser } from "@/lib/supabase/server";

/** Request-scoped cached session user for app routes. */
export const getViewerUser = cache(async () => {
  return getSessionUser().catch(() => null);
});

/** Request-scoped cached admin check for the current user. */
export const getViewerIsAdmin = cache(async () => {
  const user = await getViewerUser();
  if (!user?.id) return false;
  return isUserAdmin(user.id);
});

export async function requireViewer() {
  const user = await getViewerUser();
  if (!user) redirect("/");
  return user;
}

export async function requireAdminViewer() {
  const user = await requireViewer();
  const isAdmin = await getViewerIsAdmin();
  if (!isAdmin) redirect("/dashboard");
  return user;
}

