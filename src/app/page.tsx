import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/supabase/server";
import { isAuthConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isAuthConfigured()) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-zinc-950">
        <p className="max-w-md text-center text-sm text-zinc-600">
          Add <code className="rounded bg-zinc-200 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          (or <code className="rounded bg-zinc-200 px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>)
          to <code className="rounded bg-zinc-200 px-1">.env.local</code> for admin login.
        </p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-zinc-950">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
