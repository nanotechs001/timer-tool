import { notFound } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/config";
import { getClient, getReportBySlug } from "@/lib/ledger";
import { resolveShareBase } from "@/lib/share-base";
import { PublicReportView } from "@/components/public-report-view";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicReportPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) notFound();
  const client = report.clientId ? await getClient(report.clientId) : null;
  const shareBase = await resolveShareBase();

  return <PublicReportView report={report} client={client} shareBase={shareBase} />;
}
