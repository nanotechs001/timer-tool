import { redirect } from "next/navigation";
import { publicAppUrl } from "@/lib/config";
import { isClickUpOAuthConfigured } from "@/lib/clickup/config";
import {
  getClickUpAccessToken,
  isClickUpTableAvailable,
} from "@/lib/clickup/store";
import { IntegrationsClickUpPanel } from "@/components/integrations-clickup-panel";
import { isUserAdmin } from "@/lib/profiles";
import { getSessionUser } from "@/lib/supabase/server";
import { headers } from "next/headers";

type Props = { searchParams: Promise<{ clickup?: string }> };

export default async function IntegrationsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const oauth = isClickUpOAuthConfigured();
  const user = await getSessionUser();
  if (!user?.id) {
    redirect("/");
  }
  if (!(await isUserAdmin(user.id))) {
    redirect("/dashboard");
  }
  const clickupTableReady = await isClickUpTableAvailable();
  const initialConnected =
    clickupTableReady && user?.id
      ? Boolean(await getClickUpAccessToken(user.id))
      : false;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const fallbackOrigin = `${proto}://${host}`;
  const base = publicAppUrl() || fallbackOrigin.replace(/\/$/, "");
  const callbackUrl = `${base.replace(/\/$/, "")}/api/clickup/callback`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect external tools. Credentials stay on the server.
        </p>
      </div>
      <IntegrationsClickUpPanel
        key={`${initialConnected}-${sp.clickup ?? ""}-${clickupTableReady}`}
        oauthConfigured={oauth}
        callbackUrl={callbackUrl}
        notice={sp.clickup}
        initialConnected={initialConnected}
        clickupTableReady={clickupTableReady}
      />
    </div>
  );
}
