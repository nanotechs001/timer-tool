import { z } from "zod";
import { guardAuthenticatedRequest, jsonError } from "@/lib/api-guard";
import { listReportSnapshots } from "@/lib/ledger";

type Ctx = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();

export async function GET(_req: Request, ctx: Ctx) {
  const denied = await guardAuthenticatedRequest();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  try {
    const snapshots = await listReportSnapshots(id);
    return Response.json(snapshots);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load snapshots";
    return jsonError(msg, 502);
  }
}
