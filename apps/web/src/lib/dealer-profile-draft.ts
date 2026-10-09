import type { BudgetBand, ExperienceBand, PropertyType, TransactionType } from '@estateflow/shared';

const KEY = 'ef_dealer_profile_draft';

export interface DealerProfileDraft {
  fullName: string;
  mobile: string;
  email: string;
  agencyName: string;
  operatingLocalities: string[];
  propertyTypes: PropertyType[];
  transactionTypes: TransactionType[];
  budgetBands: BudgetBand[];
  experienceBand?: ExperienceBand;
}

export function saveDealerProfileDraft(draft: DealerProfileDraft) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(KEY, JSON.stringify(draft));
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadDealerProfileDraft(): DealerProfileDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY) ?? window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DealerProfileDraft;
    if (!parsed?.fullName || !parsed?.agencyName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDealerProfileDraft() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KEY);
  window.localStorage.removeItem(KEY);
}
