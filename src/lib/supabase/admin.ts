import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerSecret } from "@/lib/config";

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServerSecret();
  if (!url || !key) {
    throw new Error(
      "Supabase URL or server secret is not configured (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
