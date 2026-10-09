'use client';

import type { UserRole } from '@estateflow/shared';
import { DEMO_ENABLED } from './demo-policy';

// Inlined env check, not DEMO_ENABLED: the minifier only drops the literal when the condition is local.
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_APP_ENV !== 'production' ? 'Demo123!' : '';

export interface DemoUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export const DEMO_USERS: Record<UserRole, DemoUser> = {
  dealer: {
    id: 'demo-dealer-001',
    email: 'dealer@estateflow.demo',
    role: 'dealer',
    name: 'Raj Mehta',
  },
  buyer: {
    id: 'demo-buyer-001',
    email: 'buyer@estateflow.demo',
    role: 'buyer',
    name: 'Demo Buyer',
  },
  builder: {
    id: 'demo-builder-001',
    email: 'builder@estateflow.demo',
    role: 'builder',
    name: 'Demo Builder',
  },
  seller: {
    id: 'demo-seller-001',
    email: 'seller@estateflow.demo',
    role: 'seller',
    name: 'Demo Seller',
  },
};

const SESSION_KEY = 'ef_demo_session';

export function getDemoSession(): DemoUser | null {
  if (!DEMO_ENABLED || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoUser;
    return parsed?.role ? parsed : null;
  } catch {
    return null;
  }
}

export function setDemoSession(user: DemoUser | null) {
  if (typeof window === 'undefined') return;
  if (user && DEMO_ENABLED) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}

export function demoSignIn(role: UserRole): DemoUser {
  const user = DEMO_USERS[role];
  setDemoSession(user);
  return user;
}

export function demoSignInWithPassword(role: UserRole, email: string, password: string): DemoUser | null {
  const expected = DEMO_USERS[role];
  if (!DEMO_ENABLED) return null;
  if (email.trim().toLowerCase() !== expected.email || password !== DEMO_PASSWORD) return null;
  setDemoSession(expected);
  return expected;
}

export function demoSignOut() {
  setDemoSession(null);
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'dealer':
      return '/dealer';
    case 'buyer':
      return '/buyer';
    case 'builder':
      return '/builder';
    case 'seller':
      return '/seller';
    default:
      return '/';
  }
}
