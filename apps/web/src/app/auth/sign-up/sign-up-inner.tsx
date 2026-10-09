'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PROPERTY_TYPES, TRANSACTION_TYPES, type PropertyType, type TransactionType } from '@estateflow/shared';
import { demoSignIn, homePathForRole } from '@/lib/demo-auth';
import { DEMO_ENABLED } from '@/lib/demo-policy';
import { api, ApiError, setPendingSubjectId } from '@/lib/api-client';
import { setWorkspaceMode } from '@/lib/workspace';
import { loadDealerProfileDraft, saveDealerProfileDraft } from '@/lib/dealer-profile-draft';
import { parseRoleParam } from '@/features/auth/role-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast';
import { PROPERTY_TYPE_LABELS, SUGGESTED_LOCALITIES, TRANSACTION_LABELS } from '@/features/onboarding/constants';

export function SignUpInner() {
  const params = useSearchParams();
  const role = parseRoleParam(params.get('role')) ?? 'dealer';
  const router = useRouter();
  const { notify } = useToast();
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [localities, setLocalities] = useState<string[]>(['Dwarka']);
  const [customLocality, setCustomLocality] = useState('');
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(['flat']);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>(['sale']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = loadDealerProfileDraft();
    if (!draft) return;
    setFullName(draft.fullName);
    setMobile(draft.mobile.replace(/^\+91/, ''));
    setAgencyName(draft.agencyName);
    setEmail(draft.email);
    if (draft.operatingLocalities.length) setLocalities(draft.operatingLocalities);
    if (draft.propertyTypes.length) setPropertyTypes(draft.propertyTypes);
    if (draft.transactionTypes.length) setTransactionTypes(draft.transactionTypes);
  }, []);

  function toggle<T extends string>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function persistDraft() {
    saveDealerProfileDraft({
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      agencyName: agencyName.trim(),
      operatingLocalities: localities,
      propertyTypes,
      transactionTypes,
      budgetBands: ['50l_1cr', '1cr_2cr'],
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError('Dealer name likhein.');
      return;
    }
    if (role === 'dealer') {
      if (mobile.replace(/\D/g, '').length < 10) {
        setError('Valid Indian mobile number likhein.');
        return;
      }
      if (agencyName.trim().length < 2) {
        setError('Company / agency name required hai.');
        return;
      }
      if (!localities.length) {
        setError('Kam se kam ek operating locality choose karein.');
        return;
      }
    }
    if (!email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (role === 'dealer') persistDraft();
    if (role !== 'dealer' && role !== 'builder') {
      if (!DEMO_ENABLED) {
        setError('Only dealer accounts can be created right now.');
        return;
      }
      setWorkspaceMode('demo');
      demoSignIn(role);
      notify('Preview account created in this browser only');
      router.push(homePathForRole(role));
      return;
    }
    setLoading(true);
    api.signUp({ email: email.trim(), password, role: role === 'builder' ? 'builder' : 'dealer' })
      .then((result) => {
        setPendingSubjectId(result.subjectId);
        notify(result.devVerifyCode ? `Verification code ${result.devVerifyCode}` : 'Check your email to verify.');
        router.push(role === 'dealer' ? '/auth/verify?next=/dealer/onboarding' : '/auth/verify');
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Sign-up failed.');
      })
      .finally(() => setLoading(false));
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="name">Dealer name</Label>
        <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
      </div>
      {role === 'dealer' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="mobile">Phone number</Label>
            <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="9876543210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency">Company / agency name</Label>
            <Input id="agency" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="EstateFlow Demo Realty" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Where do you operate?</legend>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_LOCALITIES.map((item) => (
                <Button key={item} type="button" size="sm" variant={localities.includes(item) ? 'accept' : 'outline'} onClick={() => toggle(localities, item, setLocalities)}>
                  {item}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={customLocality} onChange={(e) => setCustomLocality(e.target.value)} placeholder="Add locality" aria-label="Custom locality" />
              <Button type="button" variant="outline" onClick={() => {
                if (customLocality.trim()) {
                  setLocalities((cur) => Array.from(new Set([...cur, customLocality.trim()])));
                  setCustomLocality('');
                }
              }}>Add</Button>
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Property types you handle</legend>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((item) => (
                <Button key={item} type="button" size="sm" variant={propertyTypes.includes(item) ? 'accept' : 'outline'} onClick={() => toggle(propertyTypes, item, setPropertyTypes)}>
                  {PROPERTY_TYPE_LABELS[item]}
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Deal types</legend>
            <div className="flex flex-wrap gap-2">
              {TRANSACTION_TYPES.map((item) => (
                <Button key={item} type="button" size="sm" variant={transactionTypes.includes(item) ? 'accept' : 'outline'} onClick={() => toggle(transactionTypes, item, setTransactionTypes)}>
                  {TRANSACTION_LABELS[item]}
                </Button>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <Button type="submit" variant="accept" className="w-full" disabled={loading}>
        {loading ? 'Creating…' : role === 'dealer' ? 'Create dealer account' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/auth/sign-in?role=${role}`} className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
