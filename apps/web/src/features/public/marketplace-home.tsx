'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Calculator,
  Compass,
  GitCompare,
  Home,
  Landmark,
  MapPin,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { createDemoBuilderWorkspace } from '@estateflow/shared';
import { PUBLIC_LISTINGS } from '@/lib/public-listings';
import { formatCr, localitySnapshots, trendingLocalities } from '@/lib/marketplace-stats';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { HeroVideo } from '@/components/hero-video';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'buy', label: 'Buy', icon: Home },
  { id: 'rent', label: 'Rent', icon: Building2 },
  { id: 'projects', label: 'Projects', icon: Landmark },
  { id: 'list', label: 'List property', icon: MapPin },
  { id: 'agents', label: 'Agents', icon: Users },
] as const;

const JOURNEY = [
  {
    href: '/explore?purpose=buy',
    title: 'Property recommendations',
    body: 'Browse demo listings by locality, budget, and BHK. Saving a home does not contact a dealer.',
    cta: 'Show recommendations',
    tone: 'from-amber-50 to-white border-amber-100',
    icon: Sparkles,
  },
  {
    href: '/compare',
    title: 'Compare properties',
    body: 'Put two demo homes side by side — price, BHK, area, and features from stored records.',
    cta: 'Compare properties',
    tone: 'from-orange-50 to-white border-orange-100',
    icon: GitCompare,
  },
  {
    href: '/insights',
    title: 'Locality snapshot',
    body: 'Asking prices counted from the public demo catalogue. Not a live Delhi index.',
    cta: 'Open insights',
    tone: 'from-rose-50 to-white border-rose-100',
    icon: Compass,
  },
  {
    href: '/calculators',
    title: 'Explore calculators',
    body: 'Affordability and EMI estimates run in your browser. They are not a loan offer.',
    cta: 'Open calculators',
    tone: 'from-yellow-50 to-white border-yellow-100',
    icon: Calculator,
  },
] as const;

const HUB: Record<string, { title: string; href: string; note: string }[]> = {
  buyers: [
    { title: 'Search to buy', href: '/buy', note: 'Requirement-led buy flow' },
    { title: 'Search to rent', href: '/rent', note: 'Rental demo listings' },
    { title: 'Compare homes', href: '/compare', note: 'Price, BHK, area' },
    { title: '3D walkthrough', href: '/explore/demo-dwarka-3bhk', note: 'Illustrative sample scene' },
    { title: 'Locality insights', href: '/insights', note: 'From stored demo cards' },
    { title: 'Sell or rent yours', href: '/auth/sign-in?role=seller', note: 'Owner workspace' },
  ],
  tenants: [
    { title: 'Homes for rent', href: '/explore?purpose=rent', note: 'Demo rentals only' },
    { title: '2 BHK rentals', href: '/explore?purpose=rent&beds=2', note: 'Filter by bedrooms' },
    { title: 'Ask a dealer', href: '/agents', note: 'Demo agencies on file' },
  ],
  agents: [
    { title: 'List property', href: '/auth/sign-in?role=dealer', note: 'Dealer inventory' },
    { title: 'Dealer Connect', href: '/auth/sign-in?role=dealer', note: 'Leads, matching, visits, deals' },
    { title: 'Find an agent', href: '/agents', note: 'Public demo directory' },
    { title: 'Copilot', href: '/auth/sign-in?role=dealer', note: 'Answers from CRM records' },
  ],
  builders: [
    { title: 'Site visits & routing', href: '/auth/sign-in?role=builder', note: 'Assign buyers to dealers' },
    { title: '3D tours', href: '/auth/sign-in?role=builder', note: 'Walkthrough jobs on file' },
    { title: 'List a project', href: '/auth/sign-in?role=builder', note: 'Towers, units, dealers' },
    { title: 'Public projects', href: '/projects', note: 'Demo builder records' },
  ],
  banks: [
    { title: 'Data views', href: '/insights', note: 'Asking prices from stored listings' },
    { title: 'Financing notes', href: '/auth/sign-in?role=dealer', note: 'On a lead when a buyer volunteers them' },
    { title: 'Dealer Copilot', href: '/auth/sign-in?role=dealer', note: 'Drafts from CRM records after sign-in' },
  ],
};

export function MarketplaceHome() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('buy');
  const [q, setQ] = useState('Dwarka');
  const [hub, setHub] = useState<'buyers' | 'tenants' | 'agents' | 'builders' | 'banks'>('buyers');
  const [projectFilter, setProjectFilter] = useState('All');
  const localities = trendingLocalities();
  const snapshots = localitySnapshots();
  const featured = PUBLIC_LISTINGS.filter((item) => item.purpose === 'buy').slice(0, 4);
  const workspace = useMemo(() => createDemoBuilderWorkspace(new Date('2026-10-01T10:00:00+05:30')), []);
  const projects = workspace.projects.filter((project) => project.status === 'active' || project.status === 'upcoming');
  const dealers = workspace.dealers.filter((dealer) => dealer.active && !dealer.suspended);
  const corridors = ['All', ...[...new Set(projects.map((project) => project.locality))]];

  function searchHref() {
    if (tab === 'projects') return '/projects';
    if (tab === 'list') return '/auth/sign-in?role=seller';
    if (tab === 'agents') return '/agents';
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('purpose', tab);
    return `/explore?${params.toString()}`;
  }

  const visibleProjects = projectFilter === 'All' ? projects : projects.filter((project) => project.locality === projectFilter);

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />

      <section className="relative min-h-[34rem] overflow-hidden text-white">
        <HeroVideo />
        <div className="relative mx-auto flex min-h-[34rem] max-w-6xl flex-col justify-center px-4 py-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-xs">
            Demo catalogue · {PUBLIC_LISTINGS.length} public listings
          </p>
          <h1 className="mt-4 max-w-3xl text-hero tracking-tight">Delhi NCR real estate</h1>
          <p className="mt-3 max-w-xl text-lg text-white/85">
            From search to keys — buy, rent, list, and work with dealers on one connected workspace.
          </p>
          <div className="mt-8 rounded-2xl bg-white p-3 text-foreground shadow-2xl">
            <div className="flex flex-wrap gap-1">
              {TABS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm',
                      tab === item.id ? 'bg-amber-400 font-semibold text-black' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Locality or landmark</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-12 w-full rounded-xl border px-10 text-sm"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      router.push(searchHref());
                    }
                  }}
                  placeholder="Search by locality, e.g. Dwarka"
                />
              </label>
              <Button type="button" variant="outline" className="h-12 shrink-0" asChild>
                <Link href="/auth/sign-in?role=dealer">Ask AI</Link>
              </Button>
              <Button asChild className="h-12 shrink-0 bg-amber-400 px-8 text-black hover:bg-amber-300">
                <Link href={searchHref()}>Search</Link>
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Trending searches:</span>
              {localities.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full bg-muted px-3 py-1 hover:bg-amber-100"
                  onClick={() => {
                    setQ(item);
                    setTab('buy');
                    router.push(`/explore?q=${encodeURIComponent(item)}&purpose=buy`);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold">Start your journey</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {JOURNEY.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className={cn('rounded-2xl border bg-gradient-to-b p-5 shadow-sm transition hover:-translate-y-0.5', card.tone)}>
                <Icon className="h-6 w-6 text-amber-600" />
                <p className="mt-3 font-semibold">{card.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700">{card.cta} <ArrowRight className="h-3.5 w-3.5" /></p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Hot selling projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">Counted from the demo builder workspace. These are not live launches.</p>
          </div>
          <Link href="/projects" className="text-sm font-medium text-amber-700">Projects in this catalogue →</Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {corridors.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setProjectFilter(item)}
              className={cn('rounded-full border px-3 py-1.5 text-sm', projectFilter === item ? 'border-black bg-black text-white' : 'bg-white')}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {visibleProjects.map((project, index) => {
            const units = workspace.units.filter((unit) => unit.projectId === project.id);
            const prices = units.map((unit) => unit.basePrice);
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="min-w-[16rem] max-w-xs flex-1 overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="relative h-40 bg-gradient-to-br from-slate-700 to-teal-700 p-4 text-white">
                  <span className="text-4xl font-bold text-white/40">{index + 1}</span>
                  <Badge className="absolute right-3 top-3 bg-white/20 text-white">Demo</Badge>
                </div>
                <div className="p-4">
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.locality}, {project.city}</p>
                  <p className="mt-2 text-sm">{prices.length ? `${formatCr(Math.min(...prices))} onwards` : 'Price not recorded'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.developerName} · {project.constructionStatus.replace(/_/g, ' ')}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Everything you need in one place</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ['buyers', 'For buyers / owners'],
              ['tenants', 'For tenants'],
              ['agents', 'For agents'],
              ['builders', 'For developers'],
              ['banks', 'For banks & NBFCs'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setHub(id)}
                className={cn('rounded-full px-4 py-1.5 text-sm', hub === id ? 'bg-black text-white' : 'bg-muted text-muted-foreground')}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HUB[hub].map((item) => (
              <Link key={item.title} href={item.href} className="rounded-xl border p-4 hover:border-amber-300 hover:bg-amber-50/40">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-semibold">Discover homes in this catalogue</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((listing) => (
            <Link key={listing.id} href={`/explore/${listing.id}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5">
              <div className="flex h-36 items-end bg-gradient-to-br from-slate-600 to-teal-600 p-3 text-sm text-white">{listing.locality}</div>
              <div className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{listing.title}</p>
                  <Badge variant="warm">Demo</Badge>
                </div>
                <p className="text-sm">{formatCr(listing.price)}</p>
                <p className="text-xs text-muted-foreground">{listing.beds ? `${listing.beds} BHK` : listing.type} · {listing.areaSqft ? `${listing.areaSqft} sq ft` : 'Area not recorded'}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Property price insights</h2>
              <p className="mt-1 text-sm text-muted-foreground">Averages from public demo listings. Not a city-wide heat map.</p>
            </div>
            <Link href="/insights" className="text-sm font-medium text-amber-700">Explore insights →</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {snapshots.slice(0, 4).map((row, index) => (
              <Link key={row.locality} href={`/explore?q=${encodeURIComponent(row.locality)}`} className={cn('rounded-xl border p-4', ['bg-sky-50 border-sky-100', 'bg-amber-50 border-amber-100', 'bg-orange-50 border-orange-100', 'bg-violet-50 border-violet-100'][index])}>
                <p className="font-medium">{row.locality}</p>
                <p className="mt-2 text-lg font-semibold">{row.avgPsf ? `₹${row.avgPsf.toLocaleString('en-IN')} / sq ft` : row.avgSale ? formatCr(row.avgSale) : 'Price not recorded'}</p>
                <p className="text-xs text-muted-foreground">{row.saleCount} for sale · {row.rentCount} for rent</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-semibold">Top localities</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sale and rent counts are from the demo catalogue on this site.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {snapshots.map((row) => (
            <article key={row.locality} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{row.locality}</p>
                  <p className="text-sm text-muted-foreground">{row.city}</p>
                </div>
                {row.avgPsf && <p className="text-sm font-medium">₹{row.avgPsf.toLocaleString('en-IN')}/sq ft</p>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xl font-semibold">{row.saleCount}</p>
                  <p className="text-muted-foreground">For sale</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xl font-semibold">{row.rentCount}</p>
                  <p className="text-muted-foreground">For rent</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" variant="outline"><Link href={`/explore?q=${encodeURIComponent(row.locality)}`}>See listings</Link></Button>
                <Button asChild size="sm" className="bg-amber-400 text-black hover:bg-amber-300"><Link href={`/insights`}>Insights</Link></Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-semibold">Top developers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Developers attached to demo projects. Partnerships are not invented.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[...new Map(projects.map((project) => [project.developerName, project])).values()].map((project) => {
            const owned = workspace.projects.filter((row) => row.developerName === project.developerName);
            return (
              <Link key={project.developerName} href="/projects" className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold">{project.developerName}</p>
                <p className="text-sm text-muted-foreground">{owned.length === 1 ? '1 demo project' : `${owned.length} demo projects`} · {project.city}</p>
                <p className="mt-3 text-sm">{owned.map((row) => row.name).join(' · ')}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Professionals on EstateFlow</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mapped to Square Yards-style roles, using tools this product actually has.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">For agents</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/auth/sign-in?role=dealer" className="font-medium hover:underline">List property with EstateFlow</Link> — dealer inventory and public cards.</li>
                <li><Link href="/auth/sign-in?role=dealer" className="font-medium hover:underline">Dealer Connect</Link> — leads, matching, visits, deals, commissions.</li>
                <li><Link href="/agents" className="font-medium hover:underline">Find an agent</Link> — {dealers.length} active demo agencies on file.</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-800">For developers</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/auth/sign-in?role=builder" className="font-medium hover:underline">Site visits &amp; routing</Link> — assign buyers to eligible dealers.</li>
                <li><Link href="/auth/sign-in?role=builder" className="font-medium hover:underline">3D / walkthroughs</Link> — tour jobs, labelled when they are samples.</li>
                <li><Link href="/projects" className="font-medium hover:underline">Advertise a project</Link> — towers, units, and dealer access.</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-800">For banks &amp; NBFCs</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/insights" className="font-medium hover:underline">Data views</Link> — asking prices from stored listings, not bureau data.</li>
                <li><Link href="/auth/sign-in?role=dealer" className="font-medium hover:underline">Financing notes</Link> — recorded on a lead when a buyer volunteers them.</li>
                <li><Link href="/auth/sign-in?role=dealer" className="font-medium hover:underline">Dealer Copilot</Link> — drafts from CRM records after sign-in.</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Not a mortgage marketplace and not a credit product.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="overflow-hidden rounded-2xl bg-[#111] p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-400">Workspaces</p>
          <h2 className="mt-2 text-2xl font-semibold">Real estate in your pocket</h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">Open a buyer, dealer, builder, or owner workspace. Public pages stay on demo listings; live accounts stay empty until you add records.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-amber-400 text-black hover:bg-amber-300"><Link href="/get-started">Get started</Link></Button>
            <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Link href="/agents">Find an agent</Link></Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
