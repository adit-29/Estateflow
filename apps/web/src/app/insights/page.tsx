import Link from 'next/link';
import { PUBLIC_LISTINGS } from '@/lib/public-listings';
import { formatCr, localitySnapshots } from '@/lib/marketplace-stats';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function InsightsPage() {
  const rows = localitySnapshots();
  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <PublicHeader />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div>
          <p className="text-sm text-amber-700">Buyers</p>
          <h1 className="text-3xl font-semibold">Property price insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Figures are averages of the {PUBLIC_LISTINGS.length} public demo listings on EstateFlow. This is not a live Delhi heatmap, valuation, or bank data product.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.locality} className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">{row.locality}</h2>
              <p className="text-sm text-muted-foreground">{row.city}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-amber-50 p-3">
                  <dt className="text-muted-foreground">Avg asking (sale)</dt>
                  <dd className="mt-1 text-lg font-semibold">{row.avgSale ? formatCr(row.avgSale) : '—'}</dd>
                </div>
                <div className="rounded-xl bg-sky-50 p-3">
                  <dt className="text-muted-foreground">Avg rent</dt>
                  <dd className="mt-1 text-lg font-semibold">{row.avgRent ? `₹${row.avgRent.toLocaleString('en-IN')}` : '—'}</dd>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <dt className="text-muted-foreground">₹ / sq ft</dt>
                  <dd className="mt-1 text-lg font-semibold">{row.avgPsf ? `₹${row.avgPsf.toLocaleString('en-IN')}` : '—'}</dd>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <dt className="text-muted-foreground">Cards on file</dt>
                  <dd className="mt-1 text-lg font-semibold">{row.saleCount + row.rentCount}</dd>
                </div>
              </dl>
              <Link href={`/explore?q=${encodeURIComponent(row.locality)}`} className="mt-4 inline-block text-sm font-medium text-amber-700">See listings →</Link>
            </article>
          ))}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
