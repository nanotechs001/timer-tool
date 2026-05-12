import { publicAppUrl } from "@/lib/config";

export function getClickUpClientId(): string | undefined {
  return process.env.CLICKUP_CLIENT_ID?.trim();
}

export function getClickUpClientSecret(): string | undefined {
  return process.env.CLICKUP_CLIENT_SECRET?.trim();
}

export function isClickUpOAuthConfigured(): boolean {
  return Boolean(getClickUpClientId() && getClickUpClientSecret());
}

/** Base URL for OAuth redirect_uri (must match ClickUp app + Vercel domain). */
export function clickUpRedirectBase(request: Request): string {
  const fromEnv = publicAppUrl();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function clickUpCallbackUrl(request: Request): string {
  return `${clickUpRedirectBase(request)}/api/clickup/callback`;
}

export function clickUpAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const u = new URL("https://app.clickup.com/api");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}
