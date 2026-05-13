import { redirect } from "next/navigation";
import { InviteAcceptFlow } from "@/components/invite-accept-flow";
import { LoginForm } from "@/components/login-form";
import { LoginShell } from "@/components/login-shell";
import { isAuthConfigured } from "@/lib/config";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isAuthConfigured()) {
    return (
      <LoginShell>
        <p className="max-w-md text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Add <code className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          (or{" "}
          <code className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>)
          to <code className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 font-mono text-[13px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">.env.local</code> for admin login.
        </p>
      </LoginShell>
    );
  }

  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <LoginShell>
      <InviteAcceptFlow />
      <LoginForm />
    </LoginShell>
  );
}
