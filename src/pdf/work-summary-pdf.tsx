import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Client, Report } from "@/lib/types";
import {
  lineHoursProgressRatio,
  lineHoursWorked,
  totalPlannedHours,
  totalWorkedHours,
} from "@/lib/types";
import { formatHours, formatReportPeriodLine, formatSummaryUpdatedAt } from "@/lib/format";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  brand: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1433be",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  titleMain: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: { flexGrow: 1, flexShrink: 1, maxWidth: "58%", paddingRight: 8 },
  headerRight: { width: "38%", alignItems: "flex-end" },
  metaLine: { fontSize: 8, color: "#6b7280", textAlign: "right", marginBottom: 3 },
  prepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 4,
  },
  prepBox: { width: "48%" },
  prepH: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6, color: "#374151" },
  prepMuted: { fontSize: 9, color: "#6b7280" },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
    marginTop: 4,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#374151" },
  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    alignItems: "flex-start",
  },
  tdTask: { width: "38%", paddingRight: 8 },
  tdProgress: { width: "40%", paddingRight: 8 },
  tdNotes: { width: "22%" },
  progressFraction: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginBottom: 4,
    color: "#111827",
  },
  barTrack: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    width: "100%",
  },
  barFill: {
    height: 4,
    backgroundColor: "#1433be",
    borderRadius: 2,
  },
  totals: { marginTop: 16, alignItems: "flex-end" },
  grand: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1433be" },
  grandSub: { fontSize: 8, color: "#6b7280", marginTop: 4 },
  notes: { marginTop: 20, fontSize: 9, color: "#4b5563" },
  muted: { color: "#6b7280", fontSize: 8 },
});

type Props = {
  report: Report;
  client: Client | null;
};

export function WorkSummaryPdfDocument({ report, client }: Props) {
  const workedSum = totalWorkedHours(report.lineItems);
  const plannedSum = totalPlannedHours(report.lineItems);
  const lastUpdatedIso = report.updatedAt?.trim() || report.createdAt;
  const periodLine = formatReportPeriodLine(report.issueDate, report.dueDate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Work summary</Text>
            <Text style={styles.titleMain}>{report.title}</Text>
          </View>
          <View style={styles.headerRight}>
            {periodLine ? (
              <Text style={styles.metaLine}>
                Period: {periodLine}
              </Text>
            ) : null}
            <Text style={styles.metaLine}>Last updated {formatSummaryUpdatedAt(lastUpdatedIso)}</Text>
          </View>
        </View>

        <View style={styles.prepRow}>
          <View style={styles.prepBox}>
            <Text style={styles.prepH}>Prepared by</Text>
            <Text>{report.billFromName || "—"}</Text>
            {report.billFromEmail ? (
              <Text style={styles.prepMuted}>{report.billFromEmail}</Text>
            ) : null}
          </View>
          <View style={styles.prepBox}>
            <Text style={styles.prepH}>Client</Text>
            {client ? (
              <>
                <Text>{client.name}</Text>
                {client.company ? <Text style={styles.prepMuted}>{client.company}</Text> : null}
              </>
            ) : (
              <Text style={styles.prepMuted}>—</Text>
            )}
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.tdTask]}>Task</Text>
          <Text style={[styles.th, styles.tdProgress]}>Progress</Text>
          <Text style={[styles.th, styles.tdNotes]}>Notes</Text>
        </View>

        {report.lineItems.map((item) => {
          const pct = lineHoursProgressRatio(item);
          const worked = lineHoursWorked(item);
          const total = item.hours;
          return (
            <View key={item.id} style={styles.tr} wrap={false}>
              <Text style={styles.tdTask}>{item.task}</Text>
              <View style={styles.tdProgress}>
                <Text style={styles.progressFraction}>
                  {formatHours(worked)} / {formatHours(total)} hrs
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
              </View>
              <View style={styles.tdNotes}>
                {item.notes ? (
                  <Text style={{ fontSize: 8 }}>{item.notes}</Text>
                ) : (
                  <Text style={styles.muted}>—</Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.totals}>
          <Text style={{ fontSize: 9, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>
            Total time
          </Text>
          <Text style={styles.grand}>
            {formatHours(workedSum)} / {formatHours(plannedSum)} hrs
          </Text>
          <Text style={styles.grandSub}>Worked / planned</Text>
        </View>

        {report.notes ? (
          <View style={styles.notes}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Overview</Text>
            <Text>{report.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
