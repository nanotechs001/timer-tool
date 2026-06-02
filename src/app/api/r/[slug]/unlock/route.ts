import { cookies } from "next/headers";
import { jsonError } from "@/lib/api-guard";
import { getReportPasswordHashBySlug } from "@/lib/ledger";
import {
  buildReportAccessToken,
  reportAccessCookieName,
  verifyReportPassword,
} from "@/lib/report-access";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!slug) return jsonError("Invalid link", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const password = typeof (body as { password?: unknown })?.password === "string"
    ? (body as { password: string }).password
    : "";
  if (!password.trim()) return jsonError("Password is required", 400);
  try {
    const passwordHash = await getReportPasswordHashBySlug(slug);
    if (!passwordHash) return jsonError("Password is not set for this report", 400);
    const ok = verifyReportPassword(password, passwordHash);
    if (!ok) return jsonError("Incorrect password", 401);
    const cookieStore = await cookies();
    cookieStore.set(reportAccessCookieName(slug), buildReportAccessToken(slug, passwordHash), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unlock failed";
    return jsonError(msg, 500);
  }
}
