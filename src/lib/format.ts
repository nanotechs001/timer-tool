export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatHours(h: number): string {
  if (Number.isInteger(h)) return String(h);
  return h.toFixed(2);
}

/** When a work summary was created (from `created_at`). */
export function formatSummaryCreatedAt(iso: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** When the summary was last saved (`updated_at`). */
export function formatSummaryUpdatedAt(iso: string): string {
  return formatSummaryCreatedAt(iso);
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDateOnlyString(s: string): boolean {
  return ISO_DATE_ONLY.test((s ?? "").trim());
}

/** Format `reports.issue_date` / `due_date` for display (ISO range or legacy free text). */
export function formatReportPeriodLine(issueDate: string, dueDate: string): string {
  const a = (issueDate ?? "").trim();
  const b = (dueDate ?? "").trim();
  if (!a && !b) return "";

  const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

  const parseLocal = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  if (isIsoDateOnlyString(a) && isIsoDateOnlyString(b)) {
    const da = parseLocal(a);
    const db = parseLocal(b);
    if (da && db) {
      if (a === b) return fmt.format(da);
      return `${fmt.format(da)} – ${fmt.format(db)}`;
    }
  }
  if (isIsoDateOnlyString(a) && !b) {
    const da = parseLocal(a);
    return da ? fmt.format(da) : a;
  }
  if (!a && isIsoDateOnlyString(b)) {
    const db = parseLocal(b);
    return db ? fmt.format(db) : b;
  }

  if (a && b) return `${a} · ${b}`;
  return a || b;
}
