import { NextResponse } from "next/server";
import { isAuthConfigured, isDatabaseConfigured } from "@/lib/config";
import { getSessionUser } from "@/lib/supabase/server";

export function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error:
        "Supabase is not fully configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    },
    { status: 503 }
  );
}

/** API routes need DB + auth env (middleware enforces login). */
export function guardDatabase(): NextResponse | null {
  if (!isDatabaseConfigured()) return supabaseNotConfiguredResponse();
  return null;
}

/** Confirms Supabase Auth env + a valid session (do not rely on middleware alone). */
export async function guardAuthSession(): Promise<NextResponse | null> {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Auth is not configured: set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
      },
      { status: 503 }
    );
  }
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Admin JSON APIs: authenticated user + database keys. */
export async function guardAdminRequest(): Promise<NextResponse | null> {
  const authDenied = await guardAuthSession();
  if (authDenied) return authDenied;
  return guardDatabase();
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonValidation(issues: unknown, status = 400) {
  return NextResponse.json({ error: "Validation failed", issues }, { status });
}
