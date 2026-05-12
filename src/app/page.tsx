import { redirect } from "next/navigation";
import { AuthInviteHashRecovery } from "@/components/auth-invite-hash-recovery";
import { LoginForm } from "@/components/login-form";
import { isAuthConfigured } from "@/lib/config";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ code?: string | string[]; next?: string | string[] }>;
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === "string" ? v : v[0];
}

export default async function Home({ searchParams }: Props) {
  if (!isAuthConfigured()) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-background">
        <p className="max-w-md text-center text-sm text-zinc-600">
          Add <code className="rounded bg-zinc-200 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          (or <code className="rounded bg-zinc-200 px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>)
          to <code className="rounded bg-zinc-200 px-1">.env.local</code> for admin login.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const code = firstString(sp.code);
  if (code) {
    const nextRaw = firstString(sp.next) ?? "/dashboard";
    const safeNext =
      nextRaw.startsWith("/") &&
      !nextRaw.startsWith("//") &&
      !nextRaw.startsWith("/api/")
        ? nextRaw
        : "/dashboard";
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(safeNext)}`
    );
  }

  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-background">
      <AuthInviteHashRecovery />
      <LoginForm />
    </div>
  );
}
