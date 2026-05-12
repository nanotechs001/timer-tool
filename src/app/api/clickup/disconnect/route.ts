import { NextResponse } from "next/server";
import { guardAdminRequest } from "@/lib/api-guard";
import { deleteClickUpConnection } from "@/lib/clickup/store";
import { getSessionUser } from "@/lib/supabase/server";

export async function POST() {
  const denied = await guardAdminRequest();
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await deleteClickUpConnection(user.id);
  return NextResponse.json({ ok: true });
}
