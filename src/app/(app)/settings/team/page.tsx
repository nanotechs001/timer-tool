import { redirect } from "next/navigation";
import { TeamSettingsPanel } from "@/components/team-settings-panel";
import { isUserAdmin } from "@/lib/profiles";
import { getSessionUser } from "@/lib/supabase/server";

export default async function TeamSettingsPage() {
  const user = await getSessionUser();
  if (!user?.id) {
    redirect("/");
  }
  if (!(await isUserAdmin(user.id))) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Team
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Invite people by email and control who can manage integrations.
        </p>
      </div>
      <TeamSettingsPanel currentUserId={user.id} />
    </div>
  );
}
