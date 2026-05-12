import { renderToBuffer } from "@react-pdf/renderer";
import { guardDatabase, jsonError } from "@/lib/api-guard";
import { getClient, getReportBySlug } from "@/lib/ledger";
import { WorkSummaryPdfDocument } from "@/pdf/work-summary-pdf";

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
