import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey } from "@/lib/config";

/**
 * Supabase Auth email confirmation / invite redirect target.
 * Add every origin you use to Supabase → Authentication → Redirect URLs, e.g.:
 * - http://localhost:3000/  (invite `redirectTo` is the site root so `?code=` is visible to the server)
 * - http://127.0.0.1:3000/
 * - https://your-domain.com/
 * Also allow `.../auth/callback` — the app forwards `/?code=` there to exchange the session.
 *
 * Session cookies must be set on the redirect response (not only on `cookies()`),
 * or the browser may never store the session and you can see a redirect / refresh loop.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/dashboard";

  const safeNext =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.startsWith("/api/")
      ? nextRaw
      : "/dashboard";

  const redirectTo = (path: string, search?: Record<string, string>) => {
    const t = new URL(path, url.origin);
    if (search) {
      for (const [k, v] of Object.entries(search)) t.searchParams.set(k, v);
    }
    return t;
  };

  if (!code) {
    return NextResponse.redirect(redirectTo("/", { error: "auth" }));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = getSupabaseAnonKey();
  if (!supabaseUrl || !anon) {
    return NextResponse.redirect(redirectTo("/", { error: "auth_config" }));
  }

  const response = NextResponse.redirect(redirectTo(safeNext));

  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      redirectTo("/", { error: error.message })
    );
  }

  return response;
}
