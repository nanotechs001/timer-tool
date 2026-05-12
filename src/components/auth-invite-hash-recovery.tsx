"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Supabase sometimes returns implicit tokens in the URL hash after verify (e.g. invite).
 * PKCE uses ?code= on /auth/callback; this picks up hash-based sessions on any landing page.
 */
export function AuthInviteHashRecovery() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    void (async () => {
      const supabase = createBrowserClient(url, key);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const clean =
        window.location.pathname +
        (window.location.search ? window.location.search : "");
      window.history.replaceState(null, "", clean);
      router.replace("/dashboard");
      router.refresh();
    })();
  }, [router]);

  return null;
}
