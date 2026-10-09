export const USER_ROLES = ['dealer', 'buyer', 'builder', 'seller'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PLANNED_ROLES: UserRole[] = ['buyer', 'seller'];
