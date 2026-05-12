import { z } from "zod";
import {
  guardAdminRequest,
  jsonError,
  jsonValidation,
} from "@/lib/api-guard";
import { updateReportSchema } from "@/lib/schemas";
import { deleteReport, getReport, updateReport } from "@/lib/ledger";
import { nanoid } from "nanoid";
import type { LineItem } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();

type LineDraft = {
  id?: string;
  task: string;
  hours: number;
  rate?: number;
  notes?: string;
};

function normalizeLineItems(items: LineDraft[] | undefined): LineItem[] | undefined {
  if (!items) return undefined;
  return items.map((row) => ({
    ...row,
    id: row.id && row.id.length ? row.id : nanoid(10),
    rate: row.rate ?? 0,
  }));
}

export async function GET(_req: Request, ctx: Ctx) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  try {
    const report = await getReport(id);
    if (!report) return jsonError("Not found", 404);
    return Response.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load report";
    return jsonError(msg, 502);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = updateReportSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidation(parsed.error.flatten());
  }
  const d = parsed.data;
  try {
    const report = await updateReport(id, {
      title: d.title,
      clientId: d.clientId,
      lineItems: normalizeLineItems(d.lineItems),
      currency: d.currency?.toUpperCase(),
      notes: d.notes,
      issueDate: d.issueDate,
      dueDate: d.dueDate,
      billFromName: d.billFromName,
      billFromEmail: d.billFromEmail,
    });
    return Response.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update report";
    if (msg.includes("not found")) return jsonError(msg, 404);
    return jsonError(msg, 502);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  try {
    await deleteReport(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete report";
    return jsonError(msg, 502);
  }
}
