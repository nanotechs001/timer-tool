import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { isDatabaseConfigured } from "@/lib/config";
import { getClient, getReportBySlug, getReportPasswordHashBySlug } from "@/lib/ledger";
import { resolveShareBase } from "@/lib/share-base";
import { PublicReportView } from "@/components/public-report-view";
import {
  hasValidReportAccessToken,
  reportAccessCookieName,
} from "@/lib/report-access";
import { PublicReportPasswordGate } from "@/components/public-report-password-gate";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicReportPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) notFound();
  const passwordHash = await getReportPasswordHashBySlug(slug);
  if (passwordHash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(reportAccessCookieName(slug))?.value;
    if (!hasValidReportAccessToken(slug, passwordHash, cookie)) {
      return <PublicReportPasswordGate slug={slug} />;
    }
  }
  const client = report.clientId ? await getClient(report.clientId) : null;
  const shareBase = await resolveShareBase();

  return <PublicReportView report={report} client={client} shareBase={shareBase} />;
}
