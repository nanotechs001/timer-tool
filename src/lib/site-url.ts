import type { NextRequest } from "next/server";

/**
 * Public site origin for Supabase invite / OAuth redirects.
 * In development, prefer the request host so `localhost` and `127.0.0.1` match
 * the tab you’re using (otherwise cookies won’t line up and auth can loop).
 */
export function getSiteOriginFromRequest(request: Request | NextRequest): string {
  const requestOrigin = new URL(request.url).origin;
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && env) {
    return env;
  }
  return requestOrigin;
}

export function authCallbackUrl(request: Request | NextRequest): string {
  return `${getSiteOriginFromRequest(request)}/auth/callback`;
}
