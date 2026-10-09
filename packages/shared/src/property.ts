import { z } from 'zod';
import { PROPERTY_TYPES, TRANSACTION_TYPES } from './crm-enums';

export const LISTING_STATUSES = ['draft', 'active', 'paused', 'sold_rented', 'archived'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const FURNISHING_TYPES = ['unfurnished', 'semi_furnished', 'fully_furnished'] as const;

export const AREA_UNITS = ['sqft', 'sqm', 'sqyd'] as const;

export const propertyCreateSchema = z.object({
  title: z.string().min(3).max(200),
  locality: z.string().min(2).max(300),
  addressText: z.string().max(500).optional(),
  propertyType: z.enum(PROPERTY_TYPES),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().nullable(),
  areaValue: z.coerce.number().positive().optional().nullable(),
  areaUnit: z.enum(AREA_UNITS).optional().nullable(),
  priceAmount: z.coerce.number().positive().optional().nullable(),
  furnishing: z.enum(FURNISHING_TYPES).optional().nullable(),
  possessionNotes: z.string().max(300).optional(),
  transactionType: z.enum(TRANSACTION_TYPES),
  sourceContact: z.string().max(200).optional(),
  listingStatus: z.enum(LISTING_STATUSES).default('draft'),
  photoUrls: z.array(z.string().url().or(z.string().startsWith('/mock-uploads/'))).max(20).optional(),
  lastConfirmedAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional(),
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;

export const propertyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  scope: z.enum(['mine', 'network', 'builder']).default('mine'),
  listingStatus: z.enum(LISTING_STATUSES).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  locality: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['updated_desc', 'price_asc', 'price_desc']).default('updated_desc'),
});
