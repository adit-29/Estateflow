import { z } from 'zod';

export const CONNECTION_STATUSES = ['pending', 'accepted', 'rejected', 'revoked'] as const;

export const SHARE_RESOURCE_TYPES = ['property', 'lead', 'deal_collaboration'] as const;

export const dealerInviteSchema = z.object({
  inviteeEmail: z.string().email().optional(),
  inviteePhone: z.string().min(10).optional(),
}).refine((d) => d.inviteeEmail || d.inviteePhone, { message: 'Email or phone required' });

/** Pending invites are bound to the invitee email. Phone-only invites cannot be accepted until an email is set. */
export function inviteCanBeAcceptedBy(
  inviteeEmail: string | null | undefined,
  callerEmail: string,
): boolean {
  if (!inviteeEmail || !callerEmail) return false;
  return inviteeEmail.trim().toLowerCase() === callerEmail.trim().toLowerCase();
}

export const resourceShareSchema = z.object({
  connectionId: z.string().uuid(),
  resourceType: z.enum(SHARE_RESOURCE_TYPES),
  resourceId: z.string().uuid(),
});

export const commissionSplitProposalSchema = z.object({
  dealId: z.string().uuid(),
  splits: z.array(
    z.object({
      agencyId: z.string().uuid(),
      role: z.enum(['buyer_source', 'inventory_source', 'closing']),
      percentage: z.coerce.number().min(0).max(100),
    }),
  ).min(1),
});

export const reportCreateSchema = z.object({
  targetType: z.enum(['dealer_profile', 'property_listing']),
  targetId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export const visibilitySettingsSchema = z.object({
  showInDirectory: z.boolean().default(true),
  showLocalities: z.boolean().default(true),
  showPropertyTypes: z.boolean().default(true),
  showExperience: z.boolean().default(true),
  showMobile: z.boolean().default(false),
});
