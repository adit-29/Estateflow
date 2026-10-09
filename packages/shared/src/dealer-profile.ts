import { z } from 'zod';
import {
  BUDGET_BANDS,
  EXPERIENCE_BANDS,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from './crm-enums';

const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return value.trim();
};

export const dealerOnboardingSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  mobile: z
    .string()
    .transform(normalizePhone)
    .refine((v) => phoneRegex.test(v.replace(/\s/g, '')), 'Enter a valid Indian mobile number'),
  email: z.string().email('Enter a valid email'),
  agencyName: z.string().min(2, 'Agency or business name is required').max(200),
  operatingLocalities: z
    .array(z.string().min(1).max(100))
    .min(1, 'Select at least one locality'),
  propertyTypes: z
    .array(z.enum(PROPERTY_TYPES))
    .min(1, 'Select at least one property type'),
  transactionTypes: z
    .array(z.enum(TRANSACTION_TYPES))
    .min(1, 'Select at least one transaction type'),
  budgetBands: z.array(z.enum(BUDGET_BANDS)).min(1, 'Select at least one budget band'),
  experienceBand: z.enum(EXPERIENCE_BANDS),
  activeBuyerCount: z.coerce.number().int().min(0).max(10000),
  activePropertyCount: z.coerce.number().int().min(0).max(10000),
  reraNumber: z.string().max(50).optional().or(z.literal('')),
  reraRegistered: z.boolean().optional(),
  accuracyConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm the information is accurate' }),
  }),
});

export type DealerOnboardingInput = z.infer<typeof dealerOnboardingSchema>;

export const dealerOnboardingStepSchemas = [
  dealerOnboardingSchema.pick({
    fullName: true,
    mobile: true,
    email: true,
  }),
  dealerOnboardingSchema.pick({ agencyName: true }),
  dealerOnboardingSchema.pick({ operatingLocalities: true }),
  dealerOnboardingSchema.pick({
    propertyTypes: true,
    transactionTypes: true,
    budgetBands: true,
  }),
  dealerOnboardingSchema.pick({
    experienceBand: true,
    activeBuyerCount: true,
    activePropertyCount: true,
    reraNumber: true,
    reraRegistered: true,
    accuracyConfirmed: true,
  }),
] as const;
