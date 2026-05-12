import type { NextRequest } from "next/server";

function isLocalOrLoopbackOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

/**
 * Public site origin for Supabase invite / OAuth redirects.
 *
 * - **Development:** use the request host (localhost vs 127.0.0.1 must match cookies).
 * - **Production:** use `NEXT_PUBLIC_APP_URL` when it is a real public URL. If it is still
 *   set to localhost (common copy-paste mistake), use the incoming request origin instead
 *   so invite links from a deployed app do not point at your laptop.
 */
export function getSiteOriginFromRequest(request: Request | NextRequest): string {
  const requestOrigin = new URL(request.url).origin;
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    if (env && !isLocalOrLoopbackOrigin(env)) {
      return env;
    }
    return requestOrigin;
  }

  return requestOrigin;
}

export function authCallbackUrl(request: Request | NextRequest): string {
  const origin = getSiteOriginFromRequest(request).replace(/\/$/, "");
  // Use site **root** (not /auth/callback) so Supabase appends `?code=` to a URL the server can read.
  // If the redirect target is `/auth/callback` and Supabase returns tokens only in the **hash**,
  // the route handler runs without `code` (fragments are never sent to the server) and sign-in fails.
  // Home (`/`) forwards `?code=` to `/auth/callback` for cookie exchange — see `src/app/page.tsx`.
  return `${origin}/`;
}
