import type { Client, LineItem, Report, ReportSnapshot } from "@/lib/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const REPORT_COLUMNS =
  "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email,created_by_user_id,created_by_label,created_at,updated_at";

const REPORT_COLUMNS_LEGACY =
  "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email,created_at,updated_at";

const REPORT_SNAPSHOT_COLUMNS =
  "id,report_id,title,client_id,line_items,notes,issue_date,due_date,bill_from_name,bill_from_email,created_at";

function isMissingReportCreatorColumnsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("created_by") ||
    (m.includes("schema cache") && m.includes("reports"))
  );
}

function isMissingReportSnapshotsTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("report_snapshots") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("relation"))
  );
}

function parseLineItems(raw: unknown): LineItem[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const legacyUrl =
        o.resourceUrl && typeof o.resourceUrl === "string"
          ? String(o.resourceUrl).trim()
          : "";
      const lineNotes =
        o.notes != null && String(o.notes).trim() !== ""
          ? String(o.notes)
          : legacyUrl || undefined;
      const hours = Number(o.hours) || 0;
      let hoursWorked: number | undefined;
      if (o.hoursWorked !== undefined && o.hoursWorked !== null && o.hoursWorked !== "") {
        const w = Number(o.hoursWorked);
        if (Number.isFinite(w)) {
          hoursWorked = Math.min(Math.max(0, w), hours);
        }
      }
      return {
        id: String(o.id ?? crypto.randomUUID()),
        task: String(o.task ?? ""),
        hours,
        hoursWorked,
        rate: Number(o.rate) || 0,
        notes: lineNotes,
      } satisfies LineItem;
    })
    .filter(Boolean) as LineItem[];
}

const CLIENT_COLUMNS =
  "id,name,email,company,notes,clickup_team_id,clickup_space_id,clickup_folder_id,clickup_list_id";

const LEGACY_CLIENT_COLUMNS = "id,name,email,company,notes";

/** PostgREST errors before migration or stale schema cache. */
function isMissingClickupColumnsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("clickup_team_id") ||
    m.includes("clickup_space_id") ||
    m.includes("clickup_folder_id") ||
    m.includes("clickup_list_id") ||
    (m.includes("schema cache") && m.includes("clients"))
  );
}

function mapClientRow(r: {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  clickup_team_id?: string | null;
  clickup_space_id?: string | null;
  clickup_folder_id?: string | null;
  clickup_list_id?: string | null;
}): Client {
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? "",
    company: r.company ?? "",
    notes: r.notes ?? "",
    clickupTeamId: String(r.clickup_team_id ?? "").trim(),
    clickupSpaceId: String(r.clickup_space_id ?? "").trim(),
    clickupFolderId: String(r.clickup_folder_id ?? "").trim(),
    clickupListId: String(r.clickup_list_id ?? "").trim(),
  };
}

function mapReportRow(r: {
  id: string;
  slug: string;
  title: string;
  client_id: string | null;
  line_items: unknown;
  currency: string | null;
  notes: string | null;
  issue_date: string | null;
  due_date: string | null;
  bill_from_name: string | null;
  bill_from_email: string | null;
  created_by_user_id?: string | null;
  created_by_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): Report {
  const createdAt = r.created_at ?? "";
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    clientId: r.client_id,
    lineItems: parseLineItems(r.line_items),
    currency: r.currency ?? "USD",
    notes: r.notes ?? "",
    issueDate: r.issue_date ?? "",
    dueDate: r.due_date ?? "",
    billFromName: r.bill_from_name ?? "",
    billFromEmail: r.bill_from_email ?? "",
    createdByUserId: r.created_by_user_id ?? null,
    createdByLabel: r.created_by_label ?? "",
    createdAt,
    updatedAt: (r.updated_at ?? createdAt) || "",
  };
}

function mapReportSnapshotRow(r: {
  id: string;
  report_id: string;
  title: string;
  client_id: string | null;
  line_items: unknown;
  notes: string | null;
  issue_date: string | null;
  due_date: string | null;
  bill_from_name: string | null;
  bill_from_email: string | null;
  created_at?: string | null;
}): ReportSnapshot {
  return {
    id: r.id,
    reportId: r.report_id,
    title: r.title,
    clientId: r.client_id,
    lineItems: parseLineItems(r.line_items),
    notes: r.notes ?? "",
    issueDate: r.issue_date ?? "",
    dueDate: r.due_date ?? "",
    billFromName: r.bill_from_name ?? "",
    billFromEmail: r.bill_from_email ?? "",
    createdAt: r.created_at ?? "",
  };
}

function toUtcDateOnly(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function listClients(): Promise<Client[]> {
  const sb = createSupabaseAdmin();
  const first = await sb
    .from("clients")
    .select(CLIENT_COLUMNS)
    .order("company", { ascending: true })
    .order("name", { ascending: true });
  if (first.error) {
    if (!isMissingClickupColumnsError(first.error.message)) {
      throw new Error(first.error.message);
    }
    const legacy = await sb
      .from("clients")
      .select(LEGACY_CLIENT_COLUMNS)
      .order("company", { ascending: true })
      .order("name", { ascending: true });
    if (legacy.error) throw new Error(legacy.error.message);
    return (legacy.data ?? []).map(mapClientRow);
  }
  return (first.data ?? []).map(mapClientRow);
}

export async function getClient(id: string): Promise<Client | null> {
  const sb = createSupabaseAdmin();
  const first = await sb
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (first.error) {
    if (!isMissingClickupColumnsError(first.error.message)) {
      throw new Error(first.error.message);
    }
    const legacy = await sb
      .from("clients")
      .select(LEGACY_CLIENT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (legacy.error) throw new Error(legacy.error.message);
    return legacy.data ? mapClientRow(legacy.data) : null;
  }
  return first.data ? mapClientRow(first.data) : null;
}

export async function createClient(input: {
  name: string;
  email?: string;
  company?: string;
  notes?: string;
  clickupTeamId?: string;
  clickupSpaceId?: string;
  clickupFolderId?: string;
  clickupListId?: string;
}): Promise<Client> {
  const sb = createSupabaseAdmin();
  const fullRow = {
    name: input.name,
    email: input.email ?? "",
    company: input.company ?? "",
    notes: input.notes ?? "",
    clickup_team_id: input.clickupTeamId?.trim() ?? "",
    clickup_space_id: input.clickupSpaceId?.trim() ?? "",
    clickup_folder_id: input.clickupFolderId?.trim() ?? "",
    clickup_list_id: input.clickupListId?.trim() ?? "",
  };
  const ins = await sb.from("clients").insert(fullRow).select(CLIENT_COLUMNS).single();
  if (ins.error) {
    if (!isMissingClickupColumnsError(ins.error.message)) {
      throw new Error(ins.error.message);
    }
    const legacy = await sb
      .from("clients")
      .insert({
        name: fullRow.name,
        email: fullRow.email,
        company: fullRow.company,
        notes: fullRow.notes,
      })
      .select(LEGACY_CLIENT_COLUMNS)
      .single();
    if (legacy.error) throw new Error(legacy.error.message);
    if (!legacy.data) throw new Error("Insert failed");
    return mapClientRow(legacy.data);
  }
  if (!ins.data) throw new Error("Insert failed");
  return mapClientRow(ins.data);
}

export async function updateClient(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    company: string;
    notes: string;
    clickupTeamId: string;
    clickupSpaceId: string;
    clickupFolderId: string;
    clickupListId: string;
  }>
): Promise<Client> {
  const current = await getClient(id);
  if (!current) throw new Error("Client not found");
  const merged = {
    name: input.name ?? current.name,
    email: input.email ?? current.email,
    company: input.company ?? current.company,
    notes: input.notes ?? current.notes,
    clickupTeamId:
      input.clickupTeamId !== undefined
        ? input.clickupTeamId.trim()
        : current.clickupTeamId,
    clickupSpaceId:
      input.clickupSpaceId !== undefined
        ? input.clickupSpaceId.trim()
        : current.clickupSpaceId,
    clickupFolderId:
      input.clickupFolderId !== undefined
        ? input.clickupFolderId.trim()
        : current.clickupFolderId,
    clickupListId:
      input.clickupListId !== undefined
        ? input.clickupListId.trim()
        : current.clickupListId,
  };
  const sb = createSupabaseAdmin();
  const fullPatch = {
    name: merged.name,
    email: merged.email,
    company: merged.company,
    notes: merged.notes,
    clickup_team_id: merged.clickupTeamId,
    clickup_space_id: merged.clickupSpaceId,
    clickup_folder_id: merged.clickupFolderId,
    clickup_list_id: merged.clickupListId,
  };
  const upd = await sb
    .from("clients")
    .update(fullPatch)
    .eq("id", id)
    .select(CLIENT_COLUMNS)
    .single();
  if (upd.error) {
    if (!isMissingClickupColumnsError(upd.error.message)) {
      throw new Error(upd.error.message);
    }
    const legacy = await sb
      .from("clients")
      .update({
        name: merged.name,
        email: merged.email,
        company: merged.company,
        notes: merged.notes,
      })
      .eq("id", id)
      .select(LEGACY_CLIENT_COLUMNS)
      .single();
    if (legacy.error) throw new Error(legacy.error.message);
    if (!legacy.data) throw new Error("Update failed");
    return mapClientRow(legacy.data);
  }
  if (!upd.data) throw new Error("Update failed");
  return mapClientRow(upd.data);
}

export async function deleteReportsForClient(clientId: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("reports").delete().eq("client_id", clientId);
  if (error) throw new Error(error.message);
}

/** Deletes all summaries for this client, then the client row. */
export async function deleteClient(id: string): Promise<void> {
  await deleteReportsForClient(id);
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listReports(): Promise<Report[]> {
  const sb = createSupabaseAdmin();
  const first = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .order("created_at", { ascending: false });
  if (first.error) {
    if (!isMissingReportCreatorColumnsError(first.error.message)) {
      throw new Error(first.error.message);
    }
    const legacy = await sb
      .from("reports")
      .select(REPORT_COLUMNS_LEGACY)
      .order("created_at", { ascending: false });
    if (legacy.error) throw new Error(legacy.error.message);
    return (legacy.data ?? []).map((r) =>
      mapReportRow({
        ...(r as Record<string, unknown>),
        created_by_user_id: null,
        created_by_label: "",
      } as Parameters<typeof mapReportRow>[0])
    );
  }
  return (first.data ?? []).map(mapReportRow);
}

export async function getReport(id: string): Promise<Report | null> {
  const sb = createSupabaseAdmin();
  const first = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (first.error) {
    if (!isMissingReportCreatorColumnsError(first.error.message)) {
      throw new Error(first.error.message);
    }
    const legacy = await sb
      .from("reports")
      .select(REPORT_COLUMNS_LEGACY)
      .eq("id", id)
      .maybeSingle();
    if (legacy.error) throw new Error(legacy.error.message);
    return legacy.data
      ? mapReportRow({
          ...(legacy.data as Record<string, unknown>),
          created_by_user_id: null,
          created_by_label: "",
        } as Parameters<typeof mapReportRow>[0])
      : null;
  }
  return first.data ? mapReportRow(first.data) : null;
}

export async function getReportBySlug(slug: string): Promise<Report | null> {
  const sb = createSupabaseAdmin();
  const first = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (first.error) {
    if (!isMissingReportCreatorColumnsError(first.error.message)) {
      throw new Error(first.error.message);
    }
    const legacy = await sb
      .from("reports")
      .select(REPORT_COLUMNS_LEGACY)
      .eq("slug", slug)
      .maybeSingle();
    if (legacy.error) throw new Error(legacy.error.message);
    return legacy.data
      ? mapReportRow({
          ...(legacy.data as Record<string, unknown>),
          created_by_user_id: null,
          created_by_label: "",
        } as Parameters<typeof mapReportRow>[0])
      : null;
  }
  return first.data ? mapReportRow(first.data) : null;
}

export async function listReportSnapshots(reportId: string): Promise<ReportSnapshot[]> {
  const sb = createSupabaseAdmin();
  const res = await sb
    .from("report_snapshots")
    .select(REPORT_SNAPSHOT_COLUMNS)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (res.error) {
    if (isMissingReportSnapshotsTableError(res.error.message)) {
      return [];
    }
    throw new Error(res.error.message);
  }
  return (res.data ?? []).map(mapReportSnapshotRow);
}

async function createDailyReportSnapshotIfNeeded(report: Report): Promise<void> {
  const sb = createSupabaseAdmin();
  const day = toUtcDateOnly(new Date());
  const existing = await sb
    .from("report_snapshots")
    .select("id")
    .eq("report_id", report.id)
    .eq("snapshot_day", day)
    .limit(1);
  if (existing.error) {
    if (isMissingReportSnapshotsTableError(existing.error.message)) {
      return;
    }
    throw new Error(existing.error.message);
  }
  if ((existing.data ?? []).length > 0) {
    return;
  }
  const insertRes = await sb.from("report_snapshots").insert({
    report_id: report.id,
    snapshot_day: day,
    title: report.title,
    client_id: report.clientId,
    line_items: report.lineItems,
    notes: report.notes,
    issue_date: report.issueDate,
    due_date: report.dueDate,
    bill_from_name: report.billFromName,
    bill_from_email: report.billFromEmail,
  });
  if (insertRes.error && !isMissingReportSnapshotsTableError(insertRes.error.message)) {
    throw new Error(insertRes.error.message);
  }
}

export async function createReport(input: {
  title: string;
  slug: string;
  clientId: string | null;
  lineItems: LineItem[];
  currency: string;
  notes?: string;
  issueDate?: string;
  dueDate?: string;
  billFromName?: string;
  billFromEmail?: string;
  createdByUserId?: string | null;
  createdByLabel?: string;
}): Promise<Report> {
  const sb = createSupabaseAdmin();
  const insertRow: Record<string, unknown> = {
    slug: input.slug,
    title: input.title,
    client_id: input.clientId,
    line_items: input.lineItems,
    currency: input.currency,
    notes: input.notes ?? "",
    issue_date: input.issueDate ?? "",
    due_date: input.dueDate ?? "",
    bill_from_name: input.billFromName ?? "",
    bill_from_email: input.billFromEmail ?? "",
  };
  if (input.createdByUserId != null) {
    insertRow.created_by_user_id = input.createdByUserId;
  }
  if (input.createdByLabel != null && input.createdByLabel !== "") {
    insertRow.created_by_label = input.createdByLabel;
  }
  let ins = await sb.from("reports").insert(insertRow).select(REPORT_COLUMNS).single();
  if (ins.error && isMissingReportCreatorColumnsError(ins.error.message)) {
    const legacyRow = { ...insertRow } as Record<string, unknown>;
    delete legacyRow.created_by_user_id;
    delete legacyRow.created_by_label;
    ins = await sb
      .from("reports")
      .insert(legacyRow)
      .select(REPORT_COLUMNS_LEGACY)
      .single();
  }
  if (ins.error) throw new Error(ins.error.message);
  if (!ins.data) throw new Error("Insert failed");
  const row = ins.data as Record<string, unknown>;
  if (row.created_by_label === undefined) {
    row.created_by_user_id = null;
    row.created_by_label = "";
  }
  return mapReportRow(row as Parameters<typeof mapReportRow>[0]);
}

export async function updateReport(
  id: string,
  input: Partial<{
    title: string;
    clientId: string | null;
    lineItems: LineItem[];
    currency: string;
    notes: string;
    issueDate: string;
    dueDate: string;
    billFromName: string;
    billFromEmail: string;
  }>
): Promise<Report> {
  const current = await getReport(id);
  if (!current) throw new Error("Report not found");
  await createDailyReportSnapshotIfNeeded(current);
  const merged = {
    title: input.title ?? current.title,
    clientId: input.clientId !== undefined ? input.clientId : current.clientId,
    lineItems: input.lineItems ?? current.lineItems,
    currency: input.currency ?? current.currency,
    notes: input.notes ?? current.notes,
    issueDate: input.issueDate ?? current.issueDate,
    dueDate: input.dueDate ?? current.dueDate,
    billFromName: input.billFromName ?? current.billFromName,
    billFromEmail: input.billFromEmail ?? current.billFromEmail,
  };
  const sb = createSupabaseAdmin();
  let upd = await sb
    .from("reports")
    .update({
      title: merged.title,
      client_id: merged.clientId,
      line_items: merged.lineItems,
      currency: merged.currency,
      notes: merged.notes,
      issue_date: merged.issueDate,
      due_date: merged.dueDate,
      bill_from_name: merged.billFromName,
      bill_from_email: merged.billFromEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(REPORT_COLUMNS)
    .single();
  if (upd.error && isMissingReportCreatorColumnsError(upd.error.message)) {
    upd = await sb
      .from("reports")
      .update({
        title: merged.title,
        client_id: merged.clientId,
        line_items: merged.lineItems,
        currency: merged.currency,
        notes: merged.notes,
        issue_date: merged.issueDate,
        due_date: merged.dueDate,
        bill_from_name: merged.billFromName,
        bill_from_email: merged.billFromEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(REPORT_COLUMNS_LEGACY)
      .single();
  }
  if (upd.error) throw new Error(upd.error.message);
  if (!upd.data) throw new Error("Update failed");
  const row = upd.data as Record<string, unknown>;
  if (row.created_by_label === undefined) {
    row.created_by_user_id = null;
    row.created_by_label = "";
  }
  return mapReportRow(row as Parameters<typeof mapReportRow>[0]);
}

export async function deleteReport(id: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
