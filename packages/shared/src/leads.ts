import { z } from 'zod';
import {
  BUDGET_BANDS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from './crm-enums';

export const leadCreateSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(10).max(15),
  source: z.enum(LEAD_SOURCES),
  requirementSummary: z.string().max(2000).optional(),
  budgetBand: z.enum(BUDGET_BANDS).optional(),
  preferredLocalities: z.array(z.string()).default([]),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  timeline: z.string().max(200).optional(),
  financingNotes: z.string().max(1000).optional(),
  status: z.enum(LEAD_STATUSES).default('new'),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  locality: z.string().optional(),
  followUpDue: z.coerce.boolean().optional(),
  untouched: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
