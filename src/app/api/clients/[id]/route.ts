import { z } from "zod";
import {
  guardAdminRequest,
  jsonError,
  jsonValidation,
} from "@/lib/api-guard";
import { updateClientSchema } from "@/lib/schemas";
import { deleteClient, getClient, updateClient } from "@/lib/ledger";

type Ctx = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();

export async function GET(_req: Request, ctx: Ctx) {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return jsonError("Invalid id");
  try {
    const client = await getClient(id);
    if (!client) return jsonError("Not found", 404);
    return Response.json(client);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load client";
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
  const parsed = updateClientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidation(parsed.error.flatten());
  }
  try {
    const client = await updateClient(id, parsed.data);
    return Response.json(client);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update client";
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
    await deleteClient(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete client";
    return jsonError(msg, 502);
  }
}
