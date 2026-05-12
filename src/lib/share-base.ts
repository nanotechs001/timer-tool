import { headers } from "next/headers";
import { publicAppUrl } from "@/lib/config";

/** Canonical base URL for share links (env wins, else current request). */
export async function resolveShareBase(): Promise<string> {
  const env = publicAppUrl();
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
