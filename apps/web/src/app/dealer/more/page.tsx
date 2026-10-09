'use client';

import Link from 'next/link';

const GROUPS = [
  {
    label: 'Daily work',
    items: [
      ['Matching', '/dealer/matching'],
      ['Follow-ups', '/dealer/follow-ups'],
      ['Deals', '/dealer/deals'],
      ['Commissions', '/dealer/deals/commissions'],
      ['Messages', '/dealer/inbox'],
    ],
  },
  {
    label: 'Business',
    items: [
      ['Network', '/dealer/network'],
      ['Analytics', '/dealer/analytics'],
      ['Demand pool', '/dealer/demand'],
      ['Performance', '/dealer/performance'],
      ['Dealer passport', '/dealer/passport'],
    ],
  },
  {
    label: 'Tools',
    items: [
      ['AI Copilot', '/dealer/copilot'],
      ['Documents', '/dealer/documents'],
      ['Tasks', '/dealer/tasks'],
      ['Builder leads', '/dealer/builder-leads'],
      ['Search', '/dealer/search'],
      ['Notifications', '/dealer/notifications'],
      ['Settings', '/dealer/settings'],
      ['Help', '/dealer/help'],
    ],
  },
];

export default function MorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-page">More</h2>
        <p className="mt-1 text-body text-muted-foreground">Everything else in the dealer workspace.</p>
      </div>
      {GROUPS.map((group) => (
        <section key={group.label}>
          <h3 className="text-helper font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</h3>
          <ul className="mt-2 divide-y rounded-xl border">
            {group.items.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="block px-4 py-3 hover:bg-muted/40">{label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
