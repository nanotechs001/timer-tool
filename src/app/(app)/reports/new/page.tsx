import { isDatabaseConfigured } from "@/lib/config";
import { listClients } from "@/lib/ledger";
import { ReportForm } from "@/components/report-form";

export default async function NewReportPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-zinc-600">
        Configure Supabase before creating summaries.
      </div>
    );
  }

  const clients = await listClients().catch(() => []);

  return (
    <div>
      <div className="border-b border-zinc-100 bg-white px-4 py-6 dark:border-zinc-900 dark:bg-surface">
        <h1 className="mx-auto max-w-3xl text-2xl font-semibold tracking-tight">
          New work summary
        </h1>
        <p className="mx-auto mt-1 max-w-3xl text-sm text-zinc-500">
          Log tasks and hours. You will get a public link — nothing is sent as an invoice.
        </p>
      </div>
      <ReportForm clients={clients} mode="create" />
    </div>
  );
}
