import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey } from "@/lib/config";

function isProtectedPath(path: string) {
  const isProtectedPage =
    path.startsWith("/dashboard") ||
    path.startsWith("/clients") ||
    path.startsWith("/reports");
  const isProtectedApi =
    path.startsWith("/api/clients") || path.startsWith("/api/reports");
  return { isProtectedPage, isProtectedApi, isProtected: isProtectedPage || isProtectedApi };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const { isProtectedPage, isProtectedApi, isProtected } = isProtectedPath(path);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = getSupabaseAnonKey();

  /** Without URL + anon key we cannot verify sessions — deny protected routes (this was allowing open access before). */
  if (!url || !anon) {
    if (isProtected) {
      if (isProtectedApi) {
        return NextResponse.json(
          {
            error:
              "Auth is not configured: set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
          },
          { status: 503 }
        );
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("error", "auth_config");
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user && isProtected) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path === "/") {
    const next = request.nextUrl.searchParams.get("next");
    const safe =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/api/");
    const target = safe ? next : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}
