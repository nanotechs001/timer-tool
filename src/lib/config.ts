/** New “Secret” key or legacy `service_role` JWT — server only. */
export function getSupabaseServerSecret(): string | undefined {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret || legacy;
}

/** Publishable / anon key — used for Auth in browser + middleware. */
export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
}

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && getSupabaseServerSecret()
  );
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && getSupabaseAnonKey()
  );
}

export function isAppConfigured(): boolean {
  return isDatabaseConfigured() && isAuthConfigured();
}

export function publicAppUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "";
}
