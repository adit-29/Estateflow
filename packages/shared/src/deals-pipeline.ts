import { z } from 'zod';

export const DEAL_PIPELINE_STAGES = [
  'new_lead',
  'qualified',
  'site_visit',
  'negotiation',
  'booking',
  'closed_won',
  'closed_lost',
] as const;
export type DealPipelineStage = (typeof DEAL_PIPELINE_STAGES)[number];

export const COMMISSION_PAYMENT_STATUSES = [
  'pending',
  'paid',
  'overdue',
  'disputed',
] as const;

export const SITE_VISIT_STATUSES = [
  'proposed',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;

export const dealCreateSchema = z.object({
  title: z.string().min(2).max(200),
  leadId: z.string().uuid().optional(),
  buyerRequirementId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  responsibleAccountId: z.string().uuid().optional(),
  value: z.coerce.number().nonnegative().optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  pipelineStage: z.enum(DEAL_PIPELINE_STAGES).default('new_lead'),
  source: z.string().max(100).optional(),
  nextAction: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export const dealStageUpdateSchema = z.object({
  pipelineStage: z.enum(DEAL_PIPELINE_STAGES),
  confirmImportant: z.boolean().optional(),
});

export const siteVisitCreateSchema = z.object({
  buyerRequirementId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  propertyId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  meetingPoint: z.string().min(3).max(300),
  assignedAccountId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const siteVisitFeedbackSchema = z.object({
  status: z.enum(SITE_VISIT_STATUSES).optional(),
  buyerFeedback: z.string().max(3000).optional(),
  nextAction: z.string().max(500).optional(),
});

export const siteVisitScheduleSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  assignedAccountId: z.string().uuid().optional(),
  meetingPoint: z.string().min(3).max(300).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['proposed', 'confirmed', 'cancelled']).optional(),
});

export const commissionCreateSchema = z.object({
  dealId: z.string().uuid(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  fixedAmount: z.coerce.number().nonnegative().optional(),
  payerSource: z.string().max(200).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  demoLegalNote: z.literal(true, {
    errorMap: () => ({ message: 'Acknowledge demo legal disclaimer' }),
  }),
});
