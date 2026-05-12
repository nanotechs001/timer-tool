import type { Client, LineItem, Report } from "@/lib/types";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function parseLineItems(raw: unknown): LineItem[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      return {
        id: String(o.id ?? crypto.randomUUID()),
        task: String(o.task ?? ""),
        hours: Number(o.hours) || 0,
        rate: Number(o.rate) || 0,
        resourceUrl: o.resourceUrl ? String(o.resourceUrl) : undefined,
      } satisfies LineItem;
    })
    .filter(Boolean) as LineItem[];
}

function mapClientRow(r: {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
}): Client {
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? "",
    company: r.company ?? "",
    notes: r.notes ?? "",
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
}): Report {
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
  };
}

export async function listClients(): Promise<Client[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("clients")
    .select("id,name,email,company,notes")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapClientRow);
}

export async function getClient(id: string): Promise<Client | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("clients")
    .select("id,name,email,company,notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapClientRow(data) : null;
}

export async function createClient(input: {
  name: string;
  email?: string;
  company?: string;
  notes?: string;
}): Promise<Client> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("clients")
    .insert({
      name: input.name,
      email: input.email ?? "",
      company: input.company ?? "",
      notes: input.notes ?? "",
    })
    .select("id,name,email,company,notes")
    .single();
  if (error) throw new Error(error.message);
  return mapClientRow(data);
}

export async function updateClient(
  id: string,
  input: Partial<{
    name: string;
    email: string;
    company: string;
    notes: string;
  }>
): Promise<Client> {
  const current = await getClient(id);
  if (!current) throw new Error("Client not found");
  const merged = {
    name: input.name ?? current.name,
    email: input.email ?? current.email,
    company: input.company ?? current.company,
    notes: input.notes ?? current.notes,
  };
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("clients")
    .update({
      name: merged.name,
      email: merged.email,
      company: merged.company,
      notes: merged.notes,
    })
    .eq("id", id)
    .select("id,name,email,company,notes")
    .single();
  if (error) throw new Error(error.message);
  return mapClientRow(data);
}

export async function deleteClient(id: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listReports(): Promise<Report[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("reports")
    .select(
      "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReportRow);
}

export async function getReport(id: string): Promise<Report | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("reports")
    .select(
      "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapReportRow(data) : null;
}

export async function getReportBySlug(slug: string): Promise<Report | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("reports")
    .select(
      "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapReportRow(data) : null;
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
}): Promise<Report> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("reports")
    .insert({
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
    })
    .select(
      "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email"
    )
    .single();
  if (error) throw new Error(error.message);
  return mapReportRow(data);
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
  const { data, error } = await sb
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
    .select(
      "id,slug,title,client_id,line_items,currency,notes,issue_date,due_date,bill_from_name,bill_from_email"
    )
    .single();
  if (error) throw new Error(error.message);
  return mapReportRow(data);
}

export async function deleteReport(id: string): Promise<void> {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
