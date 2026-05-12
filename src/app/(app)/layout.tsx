import { redirect } from "next/navigation";
import { SetupBanner } from "@/components/setup-banner";
import { AppNav } from "@/components/app-nav";
import { isAuthConfigured } from "@/lib/config";
import { getViewerIsAdmin, requireViewer } from "@/lib/viewer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthConfigured()) {
    redirect("/?error=auth_config");
  }

  const user = await requireViewer();
  const userEmail = user.email ?? null;
  const isAdmin = await getViewerIsAdmin();

  return (
    <>
      <SetupBanner />
      <AppNav userEmail={userEmail} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </>
  );
}
