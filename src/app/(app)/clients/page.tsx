import { isDatabaseConfigured } from "@/lib/config";
import { listClients } from "@/lib/ledger";
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

  return <ClientsManager initialClients={clients} />;
}
