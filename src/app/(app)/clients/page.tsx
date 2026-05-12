import { isDatabaseConfigured } from "@/lib/config";
import { listClients } from "@/lib/ledger";
import { isUserAdmin } from "@/lib/profiles";
import { getSessionUser } from "@/lib/supabase/server";
import { ClientsManager } from "@/components/clients-manager";

export default async function ClientsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        Configure Supabase database keys to manage clients.
      </div>
    );
  }

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  try {
    clients = await listClients();
  } catch {
    clients = [];
  }

  const user = await getSessionUser().catch(() => null);
  const isAdmin = user?.id ? await isUserAdmin(user.id) : false;

  return <ClientsManager initialClients={clients} isAdmin={isAdmin} />;
}
