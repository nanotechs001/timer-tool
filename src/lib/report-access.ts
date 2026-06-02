import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_SCHEME = "s1";

function toB64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function fromB64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function hashReportPassword(password: string): string {
  const normalized = password.trim();
  const salt = toB64Url(randomBytes(16));
  const derived = scryptSync(normalized, salt, 32);
  return `${PASSWORD_SCHEME}$${salt}$${toB64Url(derived)}`;
}

export function verifyReportPassword(password: string, hash: string): boolean {
  const parts = hash.split("$");
  if (parts.length !== 3 || parts[0] !== PASSWORD_SCHEME) return false;
  const [, salt, encoded] = parts;
  const expected = fromB64Url(encoded);
  const actual = scryptSync(password.trim(), salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function reportAccessCookieName(slug: string): string {
  return `report_access_${encodeURIComponent(slug)}`;
}

export function buildReportAccessToken(slug: string, passwordHash: string): string {
  return createHash("sha256").update(`${slug}|${passwordHash}|report-access-v1`).digest("base64url");
}

export function hasValidReportAccessToken(
  slug: string,
  passwordHash: string,
  cookieValue: string | undefined
): boolean {
  if (!cookieValue) return false;
  return cookieValue === buildReportAccessToken(slug, passwordHash);
}
