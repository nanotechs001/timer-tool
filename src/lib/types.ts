export type LineItem = {
  id: string;
  task: string;
  /** Planned / budget hours for this task (column “Total”). */
  hours: number;
  /** Logged progress toward `hours`. If omitted, treated as fully done (= `hours`) for legacy rows. */
  hoursWorked?: number;
  /** Kept for backward compatibility; UI focuses on hours, not billing. */
  rate: number;
  /** Per-task notes (manual entry only; not set from ClickUp import). */
  notes?: string;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  notes: string;
  /** ClickUp hierarchy for this client (empty strings = not linked). */
  clickupTeamId: string;
  clickupSpaceId: string;
  /** Folder id when the client maps to a ClickUp folder; empty if folderless list. */
  clickupFolderId: string;
  /** Default list (e.g. chat channel) under the folder or space. */
  clickupListId: string;
};

/** Stored in `reports` — work log / task summary (not a bill). */
export type Report = {
  id: string;
  slug: string;
  title: string;
  clientId: string | null;
  lineItems: LineItem[];
  currency: string;
  notes: string;
  issueDate: string;
  dueDate: string;
  billFromName: string;
  billFromEmail: string;
  /** Who created this summary (set on insert). */
  createdByUserId: string | null;
  createdByLabel: string;
  /** ISO timestamp from DB `created_at`. */
  createdAt: string;
  /** ISO timestamp from DB `updated_at` (falls back to `createdAt` if missing). */
  updatedAt: string;
  /** True when this public share link is protected by a password. */
  hasPublicPassword: boolean;
};

export type ReportSnapshot = {
  id: string;
  reportId: string;
  title: string;
  clientId: string | null;
  lineItems: LineItem[];
  notes: string;
  issueDate: string;
  dueDate: string;
  billFromName: string;
  billFromEmail: string;
  createdAt: string;
};

export function lineSubtotal(item: LineItem): number {
  return Math.round(item.hours * item.rate * 100) / 100;
}

export function reportMoneyTotal(items: LineItem[]): number {
  return Math.round(items.reduce((s, i) => s + lineSubtotal(i), 0) * 100) / 100;
}

/** Sum of planned hours (`hours`) per line. */
export function totalPlannedHours(items: LineItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.hours, 0) * 100) / 100;
}

/** Effective worked hours for one line (legacy rows without `hoursWorked` count as full `hours`). */
export function lineHoursWorked(item: LineItem): number {
  if (item.hoursWorked !== undefined && item.hoursWorked !== null) {
    const w = Number(item.hoursWorked);
    if (Number.isFinite(w)) return Math.max(0, w);
  }
  return item.hours || 0;
}

/** 0–100 for progress UI (worked vs planned `hours`). */
export function lineHoursProgressRatio(item: LineItem): number {
  const total = Math.max(0, item.hours);
  const worked = lineHoursWorked(item);
  if (total <= 0) return worked > 0 ? 100 : 0;
  return Math.min(100, (worked / total) * 100);
}

export function totalWorkedHours(items: LineItem[]): number {
  return Math.round(items.reduce((s, i) => s + lineHoursWorked(i), 0) * 100) / 100;
}

/** @deprecated Use totalPlannedHours — kept name for older call sites meaning “planned total”. */
export function totalHours(items: LineItem[]): number {
  return totalPlannedHours(items);
}
