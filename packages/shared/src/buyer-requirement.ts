import { z } from 'zod';
import { PROPERTY_TYPES, TRANSACTION_TYPES } from './crm-enums';

export const BUYER_READINESS = ['exploring', 'shortlisting', 'ready', 'on_hold'] as const;

export const buyerRequirementCreateSchema = z.object({
  contactName: z.string().min(2).max(120),
  phone: z.string().min(10).max(15),
  localities: z.array(z.string()).min(1),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)).min(1),
  bedroomsMin: z.coerce.number().int().min(0).max(20).optional().nullable(),
  bedroomsMax: z.coerce.number().int().min(0).max(20).optional().nullable(),
  budgetMin: z.coerce.number().nonnegative().optional().nullable(),
  budgetMax: z.coerce.number().positive().optional().nullable(),
  transactionType: z.enum(TRANSACTION_TYPES),
  moveInTimeline: z.string().max(200).optional(),
  readiness: z.enum(BUYER_READINESS).default('exploring'),
  mustHaveCriteria: z.string().max(2000).optional(),
  flexibleCriteria: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  leadId: z.string().uuid().optional(),
});

export const buyerRequirementUpdateSchema = buyerRequirementCreateSchema.partial();

export const buyerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  locality: z.string().optional(),
  search: z.string().optional(),
});
