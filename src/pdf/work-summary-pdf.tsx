import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Client, Report } from "@/lib/types";
import { formatHours, formatReportPeriodLine } from "@/lib/format";
import { totalHours } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#1433be",
  },
  sub: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  box: { width: "48%" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  muted: { color: "#6b7280", fontSize: 9 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
    marginTop: 8,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#374151" },
  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  tdTask: { width: "62%" },
  tdHours: { width: "15%", textAlign: "right" },
  tdNotes: { width: "23%" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  grand: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 20, fontSize: 9, color: "#4b5563" },
});

type Props = {
  report: Report;
  client: Client | null;
};

export function WorkSummaryPdfDocument({ report, client }: Props) {
  const hours = totalHours(report.lineItems);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Work summary</Text>
        <Text style={styles.sub}>{formatReportPeriodLine(report.issueDate, report.dueDate)}</Text>

        <View style={styles.row}>
          <View style={styles.box}>
            <Text style={styles.h2}>Prepared by</Text>
            <Text>{report.billFromName || "—"}</Text>
            {report.billFromEmail ? (
              <Text style={styles.muted}>{report.billFromEmail}</Text>
            ) : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.h2}>Client</Text>
            {client ? (
              <>
                <Text>{client.name}</Text>
                {client.company ? <Text style={styles.muted}>{client.company}</Text> : null}
              </>
            ) : (
              <Text style={styles.muted}>—</Text>
            )}
          </View>
        </View>

        <Text style={styles.h2}>{report.title}</Text>
        {report.createdByLabel?.trim() ? (
          <Text style={[styles.muted, { marginTop: 6, marginBottom: 8 }]}>
            Created by {report.createdByLabel.trim()}
          </Text>
        ) : null}

        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.tdTask]}>Task</Text>
          <Text style={[styles.th, styles.tdHours]}>Hours</Text>
          <Text style={[styles.th, styles.tdNotes]}>Notes</Text>
        </View>

        {report.lineItems.map((item) => (
          <View key={item.id} style={styles.tr} wrap={false}>
            <Text style={styles.tdTask}>{item.task}</Text>
            <Text style={styles.tdHours}>{formatHours(item.hours)}</Text>
            <View style={styles.tdNotes}>
              {item.notes ? (
                <Text style={{ fontSize: 8 }}>{item.notes}</Text>
              ) : (
                <Text style={styles.muted}>—</Text>
              )}
            </View>
          </View>
        ))}

        <View style={styles.totals}>
          <Text style={styles.grand}>Total hours: {formatHours(hours)}</Text>
        </View>

        {report.notes ? (
          <View style={styles.notes}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Notes</Text>
            <Text>{report.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
