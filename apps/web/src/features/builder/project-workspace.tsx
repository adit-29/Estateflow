'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BUILDER_TOUR_STATUS_LABEL,
  LEAD_STAGE_LABEL,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  UNIT_AVAILABILITY,
  UNIT_STATUS_LABEL,
  builderAnalytics,
  collaborationStatus,
  dealerResponseRate,
  draftProjectCopy,
  matchBuyerRequirement,
  pageItems,
  qualitySignals,
  unitTotalPrice,
  type ProjectStatus,
  type UnitAvailability,
} from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass, inr, when } from '@/features/builder/format';

const TABS = [
  ['overview', 'Overview'],
  ['inventory', 'Inventory'],
  ['media', 'Media'],
  ['tours', '3D Tours'],
  ['floor-plans', 'Floor Plans'],
  ['leads', 'Leads'],
  ['dealers', 'Dealers'],
  ['visits', 'Site Visits'],
  ['marketing', 'Marketing'],
  ['analytics', 'Analytics'],
  ['settings', 'Settings'],
] as const;

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { workspace, run, mode } = useBuilderWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const tab = TABS.some((item) => item[0] === params.get('tab')) ? params.get('tab')! : 'overview';
  const project = workspace?.projects.find((item) => item.id === projectId);
  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (!project) return <p>This project is not in the workspace.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
          <p className="text-sm text-muted-foreground">{project.developerName} · {project.locality}, {project.city}</p>
        </div>
        <Badge variant="outline">{PROJECT_STATUS_LABEL[project.status]}</Badge>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Project sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${tab === id ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
            onClick={() => router.replace(`/builder/projects/${project.id}?tab=${id}`)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview projectId={project.id} />}
      {tab === 'inventory' && <Inventory projectId={project.id} />}
      {tab === 'media' && <MediaList projectId={project.id} kinds={['image', 'video', 'brochure']} />}
      {tab === 'tours' && <Tours projectId={project.id} live={mode === 'live'} />}
      {tab === 'floor-plans' && <MediaList projectId={project.id} kinds={['floor_plan']} />}
      {tab === 'leads' && <Leads projectId={project.id} />}
      {tab === 'dealers' && <Dealers projectId={project.id} />}
      {tab === 'visits' && <Visits projectId={project.id} />}
      {tab === 'marketing' && <Marketing projectId={project.id} />}
      {tab === 'analytics' && <Analytics projectId={project.id} />}
      {tab === 'settings' && <Settings projectId={project.id} run={run} />}
    </div>
  );
}

function Overview({ projectId }: { projectId: string }) {
  const { workspace } = useBuilderWorkspace();
  const project = workspace!.projects.find((item) => item.id === projectId)!;
  const units = workspace!.units.filter((unit) => unit.projectId === projectId);
  const leads = workspace!.leads.filter((lead) => lead.projectId === projectId);
  const dealers = workspace!.access.filter((row) => row.projectId === projectId);
  const tours = workspace!.tours.filter((tour) => tour.projectId === projectId && (tour.status === 'published' || tour.status === 'ready_for_review'));
  const signals = qualitySignals(workspace!).filter((item) => item.href.includes(projectId)).slice(0, 4);
  const available = units.filter((unit) => unit.availability === 'available').length;
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm">{project.description || 'No description is recorded.'}</p>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Location" value={`${project.address || 'Address not set'}, ${project.locality}`} />
        <Info label="Construction" value={project.constructionStatus.replaceAll('_', ' ')} />
        <Info label="Possession" value={project.possessionDate ?? 'Not set'} />
        <Info label="Available units" value={`${available} of ${units.length}`} />
        <Info label="Buyer demand" value={`${leads.length} recorded enquiries`} />
        <Info label="Dealer coverage" value={`${dealers.length} access records`} />
        <Info label="3D tours" value={tours.length ? `${tours.length} ready or published` : 'None published'} />
        <Info label="Visibility" value={project.visibility === 'public' ? 'Public' : 'Not a public listing'} />
      </dl>
      {signals.length > 0 && (
        <ul className="space-y-2">
          {signals.map((signal) => (
            <li key={signal.detail} className="rounded-lg border px-3 py-2 text-sm">
              <span className="font-medium">{signal.label}.</span> {signal.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Inventory({ projectId }: { projectId: string }) {
  const { workspace, run } = useBuilderWorkspace();
  const towers = workspace!.towers.filter((tower) => tower.projectId === projectId);
  const floors = workspace!.floors.filter((floor) => floor.projectId === projectId);
  const units = workspace!.units.filter((unit) => unit.projectId === projectId);
  const [page, setPage] = useState(0);
  const [towerName, setTowerName] = useState('Tower');
  const [floorTower, setFloorTower] = useState('');
  const [floorLabel, setFloorLabel] = useState('Floor 1');
  const [floorLevel, setFloorLevel] = useState(1);
  const [unitFloor, setUnitFloor] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [configuration, setConfiguration] = useState('3BHK');
  const [basePrice, setBasePrice] = useState('10000000');
  const paged = pageItems(units, page, 8);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input value={towerName} onChange={(event) => setTowerName(event.target.value)} className="max-w-xs" aria-label="Tower name" />
        <Button type="button" onClick={() => run({ type: 'add_tower', projectId, name: towerName })}>Add tower</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={`${fieldClass} max-w-xs`} value={floorTower} onChange={(event) => setFloorTower(event.target.value)} aria-label="Tower for the new floor">
          <option value="">Tower</option>
          {towers.map((tower) => <option key={tower.id} value={tower.id}>{tower.name}</option>)}
        </select>
        <Input value={floorLabel} onChange={(event) => setFloorLabel(event.target.value)} className="max-w-[10rem]" aria-label="Floor label" />
        <Input type="number" value={floorLevel} onChange={(event) => setFloorLevel(Number(event.target.value))} className="max-w-[6rem]" aria-label="Floor level" />
        <Button type="button" variant="outline" disabled={!floorTower} onClick={() => run({ type: 'add_floor', towerId: floorTower, label: floorLabel, level: floorLevel })}>Add floor</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={`${fieldClass} max-w-xs`} value={unitFloor} onChange={(event) => setUnitFloor(event.target.value)} aria-label="Floor for the new unit">
          <option value="">Floor</option>
          {floors.map((floor) => {
            const tower = towers.find((item) => item.id === floor.towerId);
            return <option key={floor.id} value={floor.id}>{tower?.name} · {floor.label}</option>;
          })}
        </select>
        <Input value={unitNumber} onChange={(event) => setUnitNumber(event.target.value)} placeholder="A-101" className="max-w-[8rem]" aria-label="Unit number" />
        <Input value={configuration} onChange={(event) => setConfiguration(event.target.value)} className="max-w-[8rem]" aria-label="Configuration" />
        <Input value={basePrice} onChange={(event) => setBasePrice(event.target.value)} className="max-w-[10rem]" aria-label="Base price" />
        <Button type="button" disabled={!unitFloor || !unitNumber} onClick={() => run({
          type: 'add_unit',
          floorId: unitFloor,
          unit: { unitNumber, configuration, bedrooms: Number(configuration.replace(/\D/g, '')) || 0, bathrooms: 2, carpetAreaSqft: 0, saleableAreaSqft: 0, facing: '', balcony: false, parking: '', basePrice: Number(basePrice) || 0, additionalCharges: 0, plc: 0, otherCharges: 0, availability: 'available' },
        })}>Add unit</Button>
      </div>
      {!units.length && <p className="text-sm text-muted-foreground">No units yet. Add a tower, a floor, then a unit.</p>}
      <div className="space-y-3 md:hidden">
        {paged.items.map((unit) => <UnitCard key={unit.id} unitId={unit.id} />)}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2 pr-3">Unit</th><th className="py-2 pr-3">Tower / floor</th><th className="py-2 pr-3">Config</th><th className="py-2 pr-3">Price</th><th className="py-2">Status</th></tr>
          </thead>
          <tbody>
            {paged.items.map((unit) => {
              const tower = towers.find((item) => item.id === unit.towerId);
              const floor = floors.find((item) => item.id === unit.floorId);
              return (
                <tr key={unit.id} className="border-t">
                  <td className="py-2 pr-3 font-medium">{unit.unitNumber}</td>
                  <td className="py-2 pr-3">{tower?.name} · {floor?.label}</td>
                  <td className="py-2 pr-3">{unit.configuration}</td>
                  <td className="py-2 pr-3">{inr(unitTotalPrice(unit))}</td>
                  <td className="py-2"><UnitStatus unitId={unit.id} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={paged.page} total={paged.total} pageSize={paged.pageSize} onPage={setPage} />
    </div>
  );
}

function UnitCard({ unitId }: { unitId: string }) {
  const { workspace } = useBuilderWorkspace();
  const unit = workspace!.units.find((item) => item.id === unitId)!;
  const tower = workspace!.towers.find((item) => item.id === unit.towerId);
  const floor = workspace!.floors.find((item) => item.id === unit.floorId);
  return (
    <article className="rounded-xl border p-3 text-sm">
      <p className="font-medium">{unit.unitNumber} · {unit.configuration}</p>
      <p className="text-muted-foreground">{tower?.name} · {floor?.label} · {inr(unitTotalPrice(unit))}</p>
      <div className="mt-2"><UnitStatus unitId={unit.id} /></div>
    </article>
  );
}

function UnitStatus({ unitId }: { unitId: string }) {
  const { workspace, run } = useBuilderWorkspace();
  const unit = workspace!.units.find((item) => item.id === unitId)!;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{UNIT_STATUS_LABEL[unit.availability]}</Badge>
      <select className="h-9 rounded-md border bg-background px-2 text-xs" value={unit.availability} aria-label={`Status for ${unit.unitNumber}`} onChange={(event) => run({ type: 'set_unit_status', unitId: unit.id, availability: event.target.value as UnitAvailability, confirm: true })}>
        {UNIT_AVAILABILITY.map((status) => <option key={status} value={status}>{UNIT_STATUS_LABEL[status]}</option>)}
      </select>
      <Input className="h-9 max-w-[9rem]" aria-label={`Base price for ${unit.unitNumber}`} defaultValue={unit.basePrice} key={unit.basePrice} onBlur={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next !== unit.basePrice) void run({ type: 'set_unit_price', unitId: unit.id, basePrice: next });
      }} />
    </div>
  );
}

function MediaList({ projectId, kinds }: { projectId: string; kinds: Array<'image' | 'video' | 'brochure' | 'floor_plan'> }) {
  const { workspace } = useBuilderWorkspace();
  const items = workspace!.media.filter((item) => item.projectId === projectId && kinds.includes(item.kind));
  const [page, setPage] = useState(0);
  const paged = pageItems(items, page, 8);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Files are listed as metadata. Bytes stay in private storage when it is configured, and are not loaded all at once.</p>
      <Button asChild variant="outline"><Link href={`/builder/projects/${projectId}/media`}>Open media library</Link></Button>
      {!items.length && <p className="text-sm text-muted-foreground">Nothing in this section yet.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {paged.items.map((item) => (
          <li key={item.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{item.fileName}</p>
            <p className="text-muted-foreground">{item.kind} · {item.category} · {when(item.createdAt)} · {item.uploadedByName}</p>
            {item.isPrimary && <Badge className="mt-2" variant="outline">Primary</Badge>}
          </li>
        ))}
      </ul>
      <Pager page={paged.page} total={paged.total} pageSize={paged.pageSize} onPage={setPage} />
    </div>
  );
}

function Tours({ projectId, live }: { projectId: string; live: boolean }) {
  const { workspace } = useBuilderWorkspace();
  const tours = workspace!.tours.filter((tour) => tour.projectId === projectId);
  return (
    <div className="space-y-3">
      {live && workspace!.reconstructionConfigured === false && <p className="rounded-lg border px-3 py-2 text-sm">3D processing provider is not configured.</p>}
      <Button asChild><Link href="/builder/3d-tours">Create 3D tour</Link></Button>
      {!tours.length && <p className="text-sm text-muted-foreground">No 3D jobs for this project.</p>}
      {tours.map((tour) => {
        const unit = workspace!.units.find((item) => item.id === tour.unitId);
        return (
          <article key={tour.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{unit?.unitNumber ?? 'Project'} · {BUILDER_TOUR_STATUS_LABEL[tour.status]}</p>
            <p className="text-muted-foreground">{tour.demoSimulation ? 'Demo job. The sample scene is not a reconstruction of an upload.' : 'Live job'}</p>
          </article>
        );
      })}
    </div>
  );
}

function Leads({ projectId }: { projectId: string }) {
  const { workspace } = useBuilderWorkspace();
  const leads = workspace!.leads.filter((lead) => lead.projectId === projectId);
  const [leadId, setLeadId] = useState(leads[0]?.id ?? '');
  const report = useMemo(() => {
    const lead = workspace!.leads.find((item) => item.id === leadId);
    if (!lead) return null;
    return matchBuyerRequirement(workspace!, {
      projectId: lead.projectId,
      unitId: lead.unitId,
      locality: lead.locality,
      propertyType: lead.propertyType,
      configuration: lead.configuration,
      bedrooms: lead.bedrooms,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      transactionType: lead.transactionType,
    });
  }, [workspace, leadId]);
  return (
    <div className="space-y-4">
      <Button asChild variant="outline"><Link href="/builder/leads/routing">Open routing dashboard</Link></Button>
      {!leads.length && <p className="text-sm text-muted-foreground">No buyer enquiries for this project.</p>}
      <ul className="space-y-2">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link href={`/builder/leads/${lead.id}`} className="block rounded-lg border px-3 py-2 text-sm hover:bg-muted/40">
              <span className="font-medium">{lead.buyerName}</span> · {lead.configuration} · {LEAD_STAGE_LABEL[lead.stage]}
            </Link>
          </li>
        ))}
      </ul>
      {leads.length > 0 && (
        <div className="space-y-2 rounded-xl border p-4">
          <label className="text-sm" htmlFor="match-lead">Match a recorded enquiry</label>
          <select id="match-lead" className={fieldClass} value={leadId} onChange={(event) => setLeadId(event.target.value)}>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.buyerName}</option>)}
          </select>
          {report && <p className="text-sm text-muted-foreground">{report.note}</p>}
          {report?.units.slice(0, 3).map((unit) => (
            <p key={unit.unitId} className="text-sm">{unit.unitNumber} · {unit.configuration} · {inr(unit.price)} · {unit.matchPercent} fit</p>
          ))}
          {report?.dealers?.eligible.slice(0, 3).map((dealer) => (
            <p key={dealer.dealerId} className="text-sm">{dealer.name} · {dealer.score} assignment compatibility</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Dealers({ projectId }: { projectId: string }) {
  const { workspace } = useBuilderWorkspace();
  const rows = workspace!.access.filter((row) => row.projectId === projectId);
  if (!workspace!.dealers.length) return <p className="text-sm text-muted-foreground">No dealers yet. Add a dealer from the dealer network, then grant project access.</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No dealer is authorized for this project.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const dealer = workspace!.dealers.find((item) => item.id === row.dealerId);
        const rate = dealer ? dealerResponseRate(dealer) : null;
        const assigned = workspace!.assignments.filter((item) => item.dealerId === row.dealerId && workspace!.leads.some((lead) => lead.id === item.leadId && lead.projectId === projectId));
        return (
          <li key={row.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{dealer?.name ?? 'Dealer'} · {dealer ? collaborationStatus(dealer) : ''}</p>
            <p className="text-muted-foreground">{row.permissions.join(', ')}</p>
            <p className="text-muted-foreground">{assigned.length} assignment records · response {rate == null ? 'not recorded' : `${Math.round(rate * 100)}%`}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Visits({ projectId }: { projectId: string }) {
  const { workspace } = useBuilderWorkspace();
  const leads = workspace!.leads.filter((lead) => lead.projectId === projectId && (lead.visitAt || lead.stage === 'visit_planned' || lead.stage === 'visited'));
  if (!leads.length) return <p className="text-sm text-muted-foreground">No site visits are recorded for this project.</p>;
  return (
    <ul className="space-y-2">
      {leads.map((lead) => (
        <li key={lead.id} className="rounded-xl border p-3 text-sm">
          <p className="font-medium">{lead.buyerName} · {LEAD_STAGE_LABEL[lead.stage]}</p>
          <p className="text-muted-foreground">{lead.visitAt ? when(lead.visitAt) : 'Date not set'} · {lead.visitOutcome ?? 'Outcome not recorded'}</p>
        </li>
      ))}
    </ul>
  );
}

function Marketing({ projectId }: { projectId: string }) {
  const { workspace } = useBuilderWorkspace();
  const project = workspace!.projects.find((item) => item.id === projectId)!;
  const copy = draftProjectCopy(project, workspace!);
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Draft from recorded project facts. Not published.</p>
      <textarea readOnly className={`${fieldClass} min-h-32`} value={copy} aria-label="Marketing draft" />
    </div>
  );
}

function Analytics({ projectId }: { projectId: string }) {
  const { workspace } = useBuilderWorkspace();
  const snapshot = builderAnalytics(workspace!, projectId);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">{snapshot.definition}</p>
      <p>Visits in the last 7 days: {snapshot.visits}</p>
      <p>Dealer response rate: {snapshot.responseRate == null ? 'No recorded responses' : `${Math.round(snapshot.responseRate * 100)}%`}</p>
      <ul>{snapshot.unitsByStatus.map((row) => <li key={row.status}>{row.status}: {row.count}</li>)}</ul>
      <ul>{snapshot.leadsByStage.map((row) => <li key={row.stage}>{row.stage}: {row.count}</li>)}</ul>
    </div>
  );
}

function Settings({ projectId, run }: { projectId: string; run: ReturnType<typeof useBuilderWorkspace>['run'] }) {
  const { workspace } = useBuilderWorkspace();
  const project = workspace!.projects.find((item) => item.id === projectId)!;
  return (
    <form className="grid max-w-lg gap-3" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void run({
        type: 'update_project',
        id: project.id,
        patch: {
          status: String(form.get('status')) as ProjectStatus,
          possessionDate: String(form.get('possession') || '') || null,
          description: String(form.get('description') ?? ''),
        },
      });
    }}>
      <label className="text-sm">Status
        <select name="status" defaultValue={project.status} className={`${fieldClass} mt-1`}>
          {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABEL[status]}</option>)}
        </select>
      </label>
      <label className="text-sm">Possession
        <Input name="possession" defaultValue={project.possessionDate ?? ''} className="mt-1" />
      </label>
      <label className="text-sm">Description
        <textarea name="description" defaultValue={project.description} className={`${fieldClass} mt-1 min-h-24`} />
      </label>
      <Button type="submit">Save project</Button>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>;
}

function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>{page + 1} / {pages}</span>
      <Button type="button" variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}
