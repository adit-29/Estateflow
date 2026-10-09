'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BUY = {
  label: 'Buy',
  href: '/buy',
  columns: [
    {
      title: 'Popular searches',
      links: [
        { href: '/explore?purpose=buy&q=Dwarka', label: 'Property in Dwarka' },
        { href: '/explore?purpose=buy&q=Janakpuri', label: 'Property in Janakpuri' },
        { href: '/explore?purpose=buy&q=Noida', label: 'Property in Noida' },
        { href: '/explore?purpose=buy&beds=2', label: '2 BHK for sale' },
        { href: '/explore?purpose=buy&beds=3', label: '3 BHK for sale' },
      ],
    },
    {
      title: 'Property type',
      links: [
        { href: '/explore?purpose=buy&type=Apartment', label: 'Apartments' },
        { href: '/explore?purpose=buy&type=Builder+Floor', label: 'Builder floors' },
        { href: '/explore?purpose=buy&type=Villa', label: 'Villas' },
        { href: '/explore?purpose=buy&type=Plot', label: 'Plots' },
      ],
    },
    {
      title: 'Projects',
      links: [
        { href: '/projects', label: 'Builder projects' },
        { href: '/explore?purpose=buy', label: 'Ready listings' },
        { href: '/insights', label: 'Locality insights' },
      ],
    },
  ],
};

const RENT = {
  label: 'Rent',
  href: '/rent',
  columns: [
    {
      title: 'Popular searches',
      links: [
        { href: '/explore?purpose=rent', label: 'Property for rent' },
        { href: '/explore?purpose=rent&q=Whitefield', label: 'Rent in Whitefield' },
        { href: '/explore?purpose=rent&beds=2', label: '2 BHK for rent' },
      ],
    },
    {
      title: 'By BHK',
      links: [
        { href: '/explore?purpose=rent&beds=2', label: '2 BHK rentals' },
        { href: '/explore?purpose=rent&beds=3', label: '3 BHK rentals' },
      ],
    },
  ],
};

const PRO = {
  label: 'For professionals',
  href: '/get-started',
  columns: [
    {
      title: 'For agents',
      links: [
        { href: '/auth/sign-in?role=dealer', label: 'List property with EstateFlow' },
        { href: '/auth/sign-in?role=dealer', label: 'Dealer Connect' },
        { href: '/agents', label: 'Find an agent' },
      ],
    },
    {
      title: 'For developers',
      links: [
        { href: '/auth/sign-in?role=builder', label: 'Site visits & dealer routing' },
        { href: '/auth/sign-in?role=builder', label: '3D / AR walkthroughs' },
        { href: '/projects', label: 'Advertise a project' },
      ],
    },
    {
      title: 'For banks & NBFCs',
      links: [
        { href: '/insights', label: 'Data views from stored records' },
        { href: '/auth/sign-in?role=dealer', label: 'Financing notes on leads' },
        { href: '/auth/sign-in?role=dealer', label: 'Copilot for dealers' },
      ],
    },
  ],
};

export function PublicHeader(_props: { overlay?: boolean } = {}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#111] text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Building2 className="h-5 w-5 text-amber-400" aria-hidden />
          EstateFlow
        </Link>
        <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Public">
          <Mega item={BUY} />
          <Mega item={RENT} />
          <Link href="/projects" className="rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">Projects</Link>
          <Mega item={PRO} />
          <Link href="/insights" className="rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">Insights</Link>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            <Link href="/auth/sign-in?role=seller">List property</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            <Link href="/auth/sign-in">Login</Link>
          </Button>
          <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
            <Link href="/get-started">Get started</Link>
          </Button>
        </div>
        <button type="button" className="lg:hidden" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="space-y-3 border-t border-white/10 bg-[#111] px-4 py-4 text-sm lg:hidden">
          {[BUY, RENT, PRO].map((menu) => (
            <div key={menu.label}>
              <Link href={menu.href} className="font-medium text-white" onClick={() => setOpen(false)}>{menu.label}</Link>
              <div className="mt-2 grid gap-2 pl-2 text-white/70">
                {menu.columns.flatMap((col) => col.links).map((link) => (
                  <Link key={`${menu.label}-${link.href}-${link.label}`} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>
                ))}
              </div>
            </div>
          ))}
          <Link href="/projects" onClick={() => setOpen(false)}>Projects</Link>
          <Link href="/auth/sign-in" onClick={() => setOpen(false)}>Login</Link>
          <Link href="/get-started" onClick={() => setOpen(false)}>Get started</Link>
        </nav>
      )}
    </header>
  );
}

function Mega({ item }: { item: typeof BUY }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link href={item.href} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">
        {item.label}
        <ChevronDown className="h-3.5 w-3.5" />
      </Link>
      {open ? (
        <div className={cn(
          'absolute left-0 top-full z-50 rounded-xl border border-black/5 bg-white p-5 text-foreground shadow-2xl',
          item.columns.length > 2 ? 'w-[42rem]' : 'w-[32rem]',
        )}>
          <div className={cn('grid gap-6', item.columns.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
            {item.columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{column.title}</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link href={link.href} className="hover:text-primary">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
