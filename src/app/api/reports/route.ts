import {
  guardAdminRequest,
  jsonError,
  jsonValidation,
} from "@/lib/api-guard";
import { createReportSchema } from "@/lib/schemas";
import { createReport, listReports } from "@/lib/ledger";
import { nanoid } from "nanoid";
import type { LineItem } from "@/lib/types";

type LineDraft = {
  id?: string;
  task: string;
  hours: number;
  rate?: number;
  resourceUrl?: string;
};

function normalizeLineItems(items: LineDraft[]): LineItem[] {
  return items.map((row) => ({
    ...row,
    id: row.id && row.id.length ? row.id : nanoid(10),
    rate: row.rate ?? 0,
  }));
}

export async function GET() {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  try {
    const reports = await listReports();
    return Response.json(reports);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list reports";
    return jsonError(msg, 502);
  }
}

export async function POST(req: Request) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidation(parsed.error.flatten());
  }
  const d = parsed.data;
  const slug = nanoid(14);
  try {
    const report = await createReport({
      title: d.title,
      slug,
      clientId: d.clientId === undefined ? null : d.clientId,
      lineItems: normalizeLineItems(d.lineItems),
      currency: (d.currency ?? "USD").toUpperCase(),
      notes: d.notes,
      issueDate: d.issueDate,
      dueDate: d.dueDate,
      billFromName: d.billFromName,
      billFromEmail: d.billFromEmail === "" ? undefined : d.billFromEmail,
    });
    return Response.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create report";
    return jsonError(msg, 502);
  }
}
