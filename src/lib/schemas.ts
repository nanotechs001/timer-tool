import { z } from "zod";

export const lineItemSchema = z.object({
  id: z.string().optional(),
  task: z.string().trim().min(1, "Task is required"),
  hours: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative().optional(),
  notes: z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  }, z.string().max(4000).optional()),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(1),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  company: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  clickupTeamId: z.string().trim().max(64).optional(),
  clickupSpaceId: z.string().trim().max(64).optional(),
  clickupFolderId: z.string().trim().max(64).optional(),
  clickupListId: z.string().trim().max(64).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const createReportSchema = z.object({
  title: z.string().trim().min(1),
  clientId: z.union([z.string().uuid(), z.null()]).optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one task"),
  currency: z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim().toUpperCase();
    return s === "" ? undefined : s;
  }, z.string().length(3).optional()),
  notes: z.string().trim().optional(),
  issueDate: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  billFromName: z.string().trim().optional(),
  billFromEmail: z
    .union([z.string().trim().email(), z.literal("")])
    .optional(),
});

export const updateReportSchema = createReportSchema.partial();
