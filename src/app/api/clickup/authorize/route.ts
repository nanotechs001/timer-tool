import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  clickUpAuthorizeUrl,
  clickUpCallbackUrl,
  getClickUpClientId,
  isClickUpOAuthConfigured,
} from "@/lib/clickup/config";
import { isUserAdmin } from "@/lib/profiles";
import { getSessionUser } from "@/lib/supabase/server";

const STATE_COOKIE = "clickup_oauth_state";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!(await isUserAdmin(user.id))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isClickUpOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/settings/integrations?clickup=missing_env", request.url)
    );
  }
  const clientId = getClickUpClientId()!;
  const redirectUri = clickUpCallbackUrl(request);
  const state = randomUUID();
  const authorize = clickUpAuthorizeUrl(clientId, redirectUri, state);
  const res = NextResponse.redirect(authorize);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
