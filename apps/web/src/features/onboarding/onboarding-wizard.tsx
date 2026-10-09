'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BUDGET_BANDS,
  EXPERIENCE_BANDS,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  type DealerOnboardingInput,
} from '@estateflow/shared';
import { ApiError, api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { clearDealerProfileDraft, loadDealerProfileDraft } from '@/lib/dealer-profile-draft';
import {
  BUDGET_LABELS,
  EXPERIENCE_LABELS,
  ONBOARDING_STEPS,
  PROPERTY_TYPE_LABELS,
  SUGGESTED_LOCALITIES,
  TRANSACTION_LABELS,
} from './constants';

type OnboardingFormState = Omit<Partial<DealerOnboardingInput>, 'accuracyConfirmed'> & {
  accuracyConfirmed?: boolean;
};

const initial: OnboardingFormState = {
  operatingLocalities: [],
  propertyTypes: [],
  transactionTypes: [],
  budgetBands: [],
  activeBuyerCount: 0,
  activePropertyCount: 0,
  accuracyConfirmed: false,
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingFormState>(initial);
  const [customLocality, setCustomLocality] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      await api.me();
      const signupDraft = loadDealerProfileDraft();
      if (signupDraft) {
        setData((prev) => ({
          ...prev,
          fullName: signupDraft.fullName || prev.fullName,
          mobile: signupDraft.mobile?.replace('+91', '') || prev.mobile,
          email: signupDraft.email || prev.email,
          agencyName: signupDraft.agencyName || prev.agencyName,
          operatingLocalities: signupDraft.operatingLocalities.length ? signupDraft.operatingLocalities : prev.operatingLocalities,
          propertyTypes: signupDraft.propertyTypes.length ? signupDraft.propertyTypes : prev.propertyTypes,
          transactionTypes: signupDraft.transactionTypes.length ? signupDraft.transactionTypes : prev.transactionTypes,
          budgetBands: signupDraft.budgetBands.length ? signupDraft.budgetBands : prev.budgetBands,
        }));
      }
      const draft = await api.getOnboarding();
      if (draft.profile && typeof draft.profile === 'object') {
        const p = draft.profile as Record<string, unknown>;
        setData((prev) => ({
          ...prev,
          fullName: (p.fullName as string) ?? prev.fullName,
          mobile: (p.mobile as string)?.replace('+91', '') ?? prev.mobile,
          email: (p.email as string) ?? prev.email,
          agencyName: (p.agency as { name?: string })?.name,
          operatingLocalities: (p.operatingLocalities as string[]) ?? [],
          propertyTypes: p.propertyTypes as DealerOnboardingInput['propertyTypes'],
          transactionTypes: p.transactionTypes as DealerOnboardingInput['transactionTypes'],
          budgetBands: p.budgetBands as DealerOnboardingInput['budgetBands'],
          experienceBand: p.experienceBand as DealerOnboardingInput['experienceBand'],
          activeBuyerCount: p.activeBuyerCount as number,
          activePropertyCount: p.activePropertyCount as number,
          reraNumber: (p.reraNumber as string) ?? '',
        }));
        if (draft.status === 'pending' || draft.status === 'verified') {
          setSubmitted(true);
        }
      }
    } catch {
      router.replace('/auth/sign-in');
    } finally {
      setBootLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleArrayItem<T extends string>(key: keyof OnboardingFormState, value: T) {
    setData((prev) => {
      const arr = (prev[key] as T[] | undefined) ?? [];
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }

  async function persistPartial() {
    await api.saveOnboarding(data as Record<string, unknown>);
  }

  async function next() {
    setError(null);
    setLoading(true);
    try {
      await persistPartial();
      if (step < ONBOARDING_STEPS.length - 1) setStep((s) => s + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save progress');
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...data,
        accuracyConfirmed: true,
      } as DealerOnboardingInput;
      await api.submitOnboarding(payload as unknown as Record<string, unknown>);
      clearDealerProfileDraft();
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('This mobile or profile may already exist. Update details or contact support.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Submission failed');
      }
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading your profile…
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg text-center space-y-4 py-12">
        <h2 className="text-2xl font-semibold">Profile submitted</h2>
        <p className="text-muted-foreground">
          Your details are under review. Completing this form does not mark you as verified — we
          use statuses such as pending until review is complete.
        </p>
        <Button onClick={() => router.push('/dealer')}>Go to workspace</Button>
      </div>
    );
  }

  const progress = ((step + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>
            Step {step + 1} of {ONBOARDING_STEPS.length}: {ONBOARDING_STEPS[step]}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" required value={data.fullName ?? ''} onChange={(e) => setData({ ...data, fullName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile number</Label>
            <Input id="mobile" required inputMode="tel" value={data.mobile ?? ''} onChange={(e) => setData({ ...data, mobile: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={data.email ?? ''} onChange={(e) => setData({ ...data, email: e.target.value })} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <Label htmlFor="agencyName">Agency / business name</Label>
          <Input id="agencyName" required value={data.agencyName ?? ''} onChange={(e) => setData({ ...data, agencyName: e.target.value })} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select localities where you actively operate.</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_LOCALITIES.map((loc) => (
              <button
                key={loc}
                type="button"
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${data.operatingLocalities?.includes(loc) ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                onClick={() => toggleArrayItem('operatingLocalities', loc)}
              >
                {loc}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add custom locality"
              value={customLocality}
              onChange={(e) => setCustomLocality(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customLocality.trim()) {
                  e.preventDefault();
                  setData({
                    ...data,
                    operatingLocalities: [...(data.operatingLocalities ?? []), customLocality.trim()],
                  });
                  setCustomLocality('');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!customLocality.trim()) return;
                setData({
                  ...data,
                  operatingLocalities: [...(data.operatingLocalities ?? []), customLocality.trim()],
                });
                setCustomLocality('');
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-medium mb-2">Property types handled</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROPERTY_TYPES.map((pt) => (
                <label key={pt} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={data.propertyTypes?.includes(pt)} onCheckedChange={() => toggleArrayItem('propertyTypes', pt)} />
                  {PROPERTY_TYPE_LABELS[pt]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium mb-2">Transaction types</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TRANSACTION_TYPES.map((tt) => (
                <label key={tt} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={data.transactionTypes?.includes(tt)} onCheckedChange={() => toggleArrayItem('transactionTypes', tt)} />
                  {TRANSACTION_LABELS[tt]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium mb-2">Typical budget bands</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {BUDGET_BANDS.map((b) => (
                <label key={b} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={data.budgetBands?.includes(b)} onCheckedChange={() => toggleArrayItem('budgetBands', b)} />
                  {BUDGET_LABELS[b]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <select
              id="experience"
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={data.experienceBand ?? ''}
              onChange={(e) => setData({ ...data, experienceBand: e.target.value as DealerOnboardingInput['experienceBand'] })}
            >
              <option value="" disabled>
                Select…
              </option>
              {EXPERIENCE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {EXPERIENCE_LABELS[b]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="buyers">Active buyers (approx.)</Label>
              <Input id="buyers" type="number" min={0} value={data.activeBuyerCount ?? 0} onChange={(e) => setData({ ...data, activeBuyerCount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="properties">Active listings (approx.)</Label>
              <Input id="properties" type="number" min={0} value={data.activePropertyCount ?? 0} onChange={(e) => setData({ ...data, activePropertyCount: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rera">RERA number (optional)</Label>
            <Input id="rera" value={data.reraNumber ?? ''} onChange={(e) => setData({ ...data, reraNumber: e.target.value, reraRegistered: Boolean(e.target.value) })} />
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
            <p className="font-medium">Review</p>
            <p>{data.fullName} · {data.agencyName}</p>
            <p className="text-muted-foreground">{(data.operatingLocalities ?? []).join(', ')}</p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={data.accuracyConfirmed === true}
              onCheckedChange={(c) => setData({ ...data, accuracyConfirmed: c === true ? true : false })}
            />
            <span>I confirm the information provided is accurate to the best of my knowledge.</span>
          </label>
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <Button type="button" variant="outline" disabled={step === 0 || loading} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        {step < ONBOARDING_STEPS.length - 1 ? (
          <Button type="button" onClick={next} disabled={loading}>
            {loading ? 'Saving…' : 'Next'}
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={loading || data.accuracyConfirmed !== true}>
            {loading ? 'Submitting…' : 'Submit profile'}
          </Button>
        )}
      </div>
    </div>
  );
}
