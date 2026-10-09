import Link from 'next/link';
import { Building2 } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-[#111] text-sm text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="font-semibold text-amber-400">Company</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/get-started">Get started</Link></li>
            <li><Link href="/explore">Explore listings</Link></li>
            <li><Link href="/insights">Price insights</Link></li>
            <li><Link href="/calculators">Calculators</Link></li>
            <li><Link href="/auth/sign-in">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-amber-400">For agents</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/auth/sign-in?role=dealer">List property with EstateFlow</Link></li>
            <li><Link href="/auth/sign-in?role=dealer">Dealer Connect</Link></li>
            <li><Link href="/agents">Find an agent</Link></li>
            <li><Link href="/auth/sign-in?role=dealer">Matching &amp; visits</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-amber-400">For developers</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/auth/sign-in?role=builder">Site visits &amp; dealer routing</Link></li>
            <li><Link href="/auth/sign-in?role=builder">3D / walkthrough tours</Link></li>
            <li><Link href="/projects">List a project</Link></li>
            <li><Link href="/auth/sign-in?role=builder">Inventory &amp; assignments</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-amber-400">For banks &amp; NBFCs</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/insights">Workspace data views</Link></li>
            <li><Link href="/auth/sign-in?role=dealer">Financing notes on leads</Link></li>
            <li><Link href="/auth/sign-in?role=dealer">Copilot for dealers</Link></li>
          </ul>
          <p className="mt-3 text-xs text-white/50">EstateFlow is not a lender and does not sell credit scores.</p>
        </div>
        <div>
          <p className="font-semibold text-amber-400">For buyers &amp; owners</p>
          <ul className="mt-3 space-y-2">
            <li><Link href="/buy">Buy a home</Link></li>
            <li><Link href="/rent">Rent a home</Link></li>
            <li><Link href="/compare">Compare properties</Link></li>
            <li><Link href="/auth/sign-in?role=seller">Sell or rent your property</Link></li>
            <li><Link href="/explore/demo-dwarka-3bhk">See a 3D demo</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6">
          <p className="flex items-center gap-2 font-semibold text-white"><Building2 className="h-4 w-4 text-amber-400" /> EstateFlow</p>
          <p className="text-xs text-white/50">Independent real-estate workspace. Public cards are demo records unless you are signed into a live account.</p>
        </div>
      </div>
    </footer>
  );
}
