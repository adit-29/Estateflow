'use client';

import { useMemo, useState } from 'react';
import { formatCr, monthlyEmi } from '@/lib/marketplace-stats';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function CalculatorsPage() {
  const [price, setPrice] = useState('14500000');
  const [down, setDown] = useState('20');
  const [rate, setRate] = useState('8.5');
  const [years, setYears] = useState('20');
  const [income, setIncome] = useState('150000');
  const [rent, setRent] = useState('45000');

  const principal = Math.max(0, Number(price) * (1 - Number(down) / 100));
  const emi = useMemo(() => monthlyEmi(principal, Number(rate) || 0, Number(years) || 1), [principal, rate, years]);
  const affordable = Number(income) * 0.4;
  const buyVsRent = emi - Number(rent);

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <p className="text-sm text-amber-700">Buyers</p>
          <h1 className="text-3xl font-semibold">Affordability calculators</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimates run in this browser with a standard reducing-balance EMI formula. This is not a loan offer, eligibility letter, or bank partnership.
          </p>
        </div>
        <form className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
          <label className="text-sm">Home price (₹)
            <input className="mt-1 h-11 w-full rounded-md border px-3" type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label className="text-sm">Down payment (%)
            <input className="mt-1 h-11 w-full rounded-md border px-3" type="number" value={down} onChange={(event) => setDown(event.target.value)} />
          </label>
          <label className="text-sm">Interest (% p.a.)
            <input className="mt-1 h-11 w-full rounded-md border px-3" type="number" step="0.1" value={rate} onChange={(event) => setRate(event.target.value)} />
          </label>
          <label className="text-sm">Tenure (years)
            <input className="mt-1 h-11 w-full rounded-md border px-3" type="number" value={years} onChange={(event) => setYears(event.target.value)} />
          </label>
          <label className="text-sm">Monthly income (₹)
            <input className="mt-1 h-11 w-full rounded-md border px-3" type="number" value={income} onChange={(event) => setIncome(event.target.value)} />
          </label>
          <label className="text-sm">Current rent (₹)
            <input className="mt-1 h-11 w-full rounded-md border px-3" type="number" value={rent} onChange={(event) => setRent(event.target.value)} />
          </label>
        </form>
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border bg-amber-50 p-4">
            <p className="text-sm text-muted-foreground">Estimated EMI</p>
            <p className="mt-1 text-2xl font-semibold">₹{Math.round(emi).toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-muted-foreground">Loan {formatCr(principal)}</p>
          </article>
          <article className="rounded-2xl border bg-sky-50 p-4">
            <p className="text-sm text-muted-foreground">40% income check</p>
            <p className="mt-1 text-2xl font-semibold">₹{Math.round(affordable).toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{emi <= affordable ? 'EMI is within this rule of thumb' : 'EMI is above this rule of thumb'}</p>
          </article>
          <article className="rounded-2xl border bg-violet-50 p-4">
            <p className="text-sm text-muted-foreground">EMI vs rent</p>
            <p className="mt-1 text-2xl font-semibold">₹{Math.round(Math.abs(buyVsRent)).toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{buyVsRent >= 0 ? 'EMI is higher than rent' : 'Rent is higher than EMI'}</p>
          </article>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
