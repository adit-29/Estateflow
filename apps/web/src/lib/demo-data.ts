'use client';

import type { UserRole } from '@estateflow/shared';
import { demoCommissions, demoDeals, demoLeads, demoProperties, demoVisits } from './demo-seed';

export interface DemoLead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  locality: string;
  followUp?: string;
  summary?: string;
  budgetMax?: number;
  beds?: number;
  intent?: string;
  timeline?: string;
  views?: number;
  savedCount?: number;
  visitCount?: number;
  attendedCount?: number;
  repeatViews?: number;
  objection?: string;
  journeys?: { property: string; stages: string[]; stop?: string }[];
}

export interface DemoProperty {
  id: string;
  title: string;
  locality: string;
  price: number;
  type: string;
  beds?: number | null;
  baths?: number | null;
  status: string;
  lastConfirmed?: string | null;
  source?: string;
}

export interface DemoVisit {
  id: string;
  propertyTitle: string;
  buyerName: string;
  when: string;
  status: string;
}

export interface DemoDeal {
  id: string;
  title: string;
  stage: string;
  value: number;
}

export interface DemoBuyerProperty {
  id: string;
  title: string;
  locality: string;
  price: number;
  beds: number;
  imageLabel: string;
}

export interface DemoBuilderProject {
  id: string;
  name: string;
  location: string;
  units: number;
  status: string;
}

export interface DemoSellerListing {
  id: string;
  title: string;
  status: 'draft' | 'enquiries' | 'viewing';
  enquiries: number;
}

const KEY = 'ef_demo_store_v2';

export interface DemoStore {
  dealer: {
    leads: DemoLead[];
    properties: DemoProperty[];
    visits: DemoVisit[];
    deals: DemoDeal[];
    commissions?: { id: string; dealTitle: string; amount: number | null; status: string }[];
  };
  buyer: {
    properties: DemoBuyerProperty[];
    savedIds: string[];
    enquiries: { id: string; propertyId: string; message: string; createdAt: string }[];
  };
  builder: {
    projects: DemoBuilderProject[];
    enquiries: { id: string; name: string; project: string; status: string }[];
  };
  seller: {
    listings: DemoSellerListing[];
  };
}

const defaultStore: DemoStore = {
  dealer: {
    leads: demoLeads,
    properties: demoProperties,
    visits: demoVisits,
    deals: demoDeals,
    commissions: demoCommissions,
  },
  buyer: {
    properties: [
      { id: 'bp1', title: 'Sunrise Residency 3 BHK', locality: 'Whitefield', price: 12500000, beds: 3, imageLabel: 'Whitefield' },
      { id: 'bp2', title: 'Lakeview 2 BHK', locality: 'HSR Layout', price: 8200000, beds: 2, imageLabel: 'HSR' },
      { id: 'bp3', title: 'Green Acres Villa Plot', locality: 'Sarjapur Road', price: 18000000, beds: 0, imageLabel: 'Sarjapur' },
      { id: 'bp4', title: 'Metro Heights 1 BHK', locality: 'Indiranagar', price: 6500000, beds: 1, imageLabel: 'Indiranagar' },
    ],
    savedIds: ['bp2'],
    enquiries: [],
  },
  builder: {
    projects: [
      { id: 'pr1', name: 'EstateFlow Heights Phase 1', location: 'Electronic City', units: 120, status: 'Selling' },
      { id: 'pr2', name: 'Riverside Enclave', location: 'Yelahanka', units: 48, status: 'Launching' },
    ],
    enquiries: [
      { id: 'e1', name: 'Channel Partner A', project: 'EstateFlow Heights', status: 'New' },
      { id: 'e2', name: 'Direct walk-in', project: 'Riverside Enclave', status: 'Follow-up' },
    ],
  },
  seller: {
    listings: [
      { id: 's1', title: '2 BHK · JP Nagar', status: 'enquiries', enquiries: 3 },
      { id: 's2', title: 'Plot · Bannerghatta Road', status: 'draft', enquiries: 0 },
    ],
  },
};

export function getDemoStore(): DemoStore {
  if (typeof window === 'undefined') return defaultStore;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultStore);
    return { ...structuredClone(defaultStore), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultStore);
  }
}

export function saveDemoStore(store: DemoStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function resetDemoStore() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
  localStorage.removeItem(DEMO_TOURS_KEY);
}

export const DEMO_TOURS_KEY = 'ef_demo_tours_v1';

export interface DemoTourJob {
  id: string;
  propertyId: string;
  propertyTitle: string;
  fileName: string;
  sizeBytes: number;
  durationSeconds: number | null;
  captureNotes: string;
  consentAt: string;
  createdAt: string;
  simulated: true;
  sampleAttached: boolean;
}

export function getDemoTours(): DemoTourJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(DEMO_TOURS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDemoTours(jobs: DemoTourJob[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_TOURS_KEY, JSON.stringify(jobs.slice(0, 20)));
}

export function roleLabel(role: UserRole): string {
  return role === 'seller' ? 'Seller / Owner' : role.charAt(0).toUpperCase() + role.slice(1);
}
