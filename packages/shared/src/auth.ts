import { z } from 'zod';
import type { UserRole } from './roles';

export const authSignUpSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  role: z.enum(['dealer', 'builder']),
});

export const authSignInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyContactSchema = z.object({
  code: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numeric'),
});

export const verifyContactRequestSchema = verifyContactSchema
  .extend({
    subjectId: z.string().min(8).max(200).optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => Boolean(d.subjectId || d.email), {
    message: 'Email or verification session is required',
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  code: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numeric'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export type AuthSignUpInput = z.infer<typeof authSignUpSchema>;
export type AuthSignInInput = z.infer<typeof authSignInSchema>;
export type VerifyContactInput = z.infer<typeof verifyContactSchema>;
export type VerifyContactRequest = z.infer<typeof verifyContactRequestSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface SessionUser {
  id: string;
  subjectId: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  platformAdmin: boolean;
  onboardingStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}
