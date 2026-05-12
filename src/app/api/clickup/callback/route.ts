import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getClickUpClientId,
  getClickUpClientSecret,
} from "@/lib/clickup/config";
import { saveClickUpAccessToken } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";
import { isDatabaseConfigured } from "@/lib/config";

const STATE_COOKIE = "clickup_oauth_state";

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(
        `/settings/integrations?clickup=${encodeURIComponent(reason)}`,
        request.url
      )
    );

  if (!code || !state || !savedState || state !== savedState) {
    const res = fail("bad_state");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  const user = await getSessionUser();
  if (!user?.id) {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  if (!isDatabaseConfigured()) {
    const res = fail("no_db");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  const clientId = getClickUpClientId();
  const clientSecret = getClickUpClientSecret();
  if (!clientId || !clientSecret) {
    const res = fail("missing_env");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  try {
    const tokenRes = await fetch("https://api.clickup.com/api/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    const body = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      err?: string;
    };
    if (!tokenRes.ok || !body.access_token) {
      const res = fail("token_exchange");
      res.cookies.delete(STATE_COOKIE);
      return res;
    }
    await saveClickUpAccessToken(user.id, body.access_token);
  } catch {
    const res = fail("token_exchange");
    res.cookies.delete(STATE_COOKIE);
    return res;
  }

  const res = NextResponse.redirect(
    new URL("/settings/integrations?clickup=connected", request.url)
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}
