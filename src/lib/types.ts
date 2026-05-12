export type LineItem = {
  id: string;
  task: string;
  hours: number;
  /** Kept for backward compatibility; UI focuses on hours, not billing. */
  rate: number;
  resourceUrl?: string;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  notes: string;
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
};

export function lineSubtotal(item: LineItem): number {
  return Math.round(item.hours * item.rate * 100) / 100;
}

export function reportMoneyTotal(items: LineItem[]): number {
  return Math.round(items.reduce((s, i) => s + lineSubtotal(i), 0) * 100) / 100;
}

export function totalHours(items: LineItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.hours, 0) * 100) / 100;
}
