import { renderToBuffer } from "@react-pdf/renderer";
import { cookies } from "next/headers";
import { guardDatabase, jsonError } from "@/lib/api-guard";
import { getClient, getReportBySlug, getReportPasswordHashBySlug } from "@/lib/ledger";
import { WorkSummaryPdfDocument } from "@/pdf/work-summary-pdf";
import { getSessionUser } from "@/lib/supabase/server";
import {
  hasValidReportAccessToken,
  reportAccessCookieName,
} from "@/lib/report-access";

type Ctx = { params: Promise<{ slug: string }> };

export const runtime = "nodejs";
/** Vercel serverless max time (seconds); PDF render can be slow. */
export const maxDuration = 60;

export async function GET(_req: Request, ctx: Ctx) {
  const denied = guardDatabase();
  if (denied) return denied;
  const { slug } = await ctx.params;
  if (!slug) return jsonError("Missing slug");
  try {
    const passwordHash = await getReportPasswordHashBySlug(slug);
    if (passwordHash) {
      const user = await getSessionUser().catch(() => null);
      if (!user?.id) {
        const cookieStore = await cookies();
        const cookie = cookieStore.get(reportAccessCookieName(slug))?.value;
        if (!hasValidReportAccessToken(slug, passwordHash, cookie)) {
          return jsonError("Password required", 401);
        }
      }
    }
    const report = await getReportBySlug(slug);
    if (!report) return jsonError("Not found", 404);
    const client = report.clientId ? await getClient(report.clientId) : null;
    const buffer = await renderToBuffer(
      <WorkSummaryPdfDocument report={report} client={client} />
    );
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="work-summary-${slug}.pdf"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF render failed";
    return jsonError(msg, 500);
  }
}
