import { redirect } from "next/navigation";
import { SetupBanner } from "@/components/setup-banner";
import { AppNav } from "@/components/app-nav";
import { isAuthConfigured } from "@/lib/config";
import { isUserAdmin } from "@/lib/profiles";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthConfigured()) {
    redirect("/?error=auth_config");
  }

  const user = await getSessionUser().catch(() => null);
  if (!user) {
    redirect("/");
  }

  const userEmail = user.email ?? null;
  const isAdmin = await isUserAdmin(user.id);

  return (
    <>
      <SetupBanner />
      <AppNav userEmail={userEmail} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </>
  );
}
