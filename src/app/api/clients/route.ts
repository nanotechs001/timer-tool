import {
  guardAdminRequest,
  jsonError,
  jsonValidation,
} from "@/lib/api-guard";
import { createClientSchema } from "@/lib/schemas";
import { createClient, listClients } from "@/lib/ledger";

export async function GET() {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  try {
    const clients = await listClients();
    return Response.json(clients);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list clients";
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
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidation(parsed.error.flatten());
  }
  try {
    const client = await createClient({
      name: parsed.data.name,
      email: parsed.data.email ?? "",
      company: parsed.data.company ?? "",
      notes: parsed.data.notes ?? "",
    });
    return Response.json(client);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create client";
    return jsonError(msg, 502);
  }
}
