'use client';

import { useMemo, useState } from 'react';
import { ACCESS_PERMISSIONS, collaborationStatus, dealerResponseRate, type AccessPermission } from '@estateflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass, when } from '@/features/builder/format';

export default function DealersPage() {
  const { workspace, run, projectId } = useBuilderWorkspace();
  const [locality, setLocality] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [transaction, setTransaction] = useState('');
  const [verification, setVerification] = useState('');
  const [activity, setActivity] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [name, setName] = useState('');
  const [agency, setAgency] = useState('');
  const [areas, setAreas] = useState('Dwarka');
  const [configs, setConfigs] = useState('3BHK');
  const [grantDealer, setGrantDealer] = useState('');
  const [grantProject, setGrantProject] = useState(projectId || '');
  const [permissions, setPermissions] = useState<AccessPermission[]>(['VIEW_PROJECT', 'RECEIVE_LEADS']);
  const [expiresAt, setExpiresAt] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDealers, setGroupDealers] = useState<string[]>([]);
  const [campaign, setCampaign] = useState('');

  const dealers = useMemo(() => {
    if (!workspace) return [];
    return workspace.dealers.filter((dealer) => {
      if (locality && !dealer.localities.some((item) => item.toLowerCase().includes(locality.toLowerCase()))) return false;
      if (propertyType && !dealer.propertyTypes.some((item) => item.toLowerCase().includes(propertyType.toLowerCase()))) return false;
      if (transaction && !dealer.transactionTypes.some((item) => item.toLowerCase().includes(transaction.toLowerCase()))) return false;
      if (verification === 'verified' && !dealer.verified) return false;
      if (verification === 'unverified' && dealer.verified) return false;
      if (activity === 'active' && collaborationStatus(dealer) !== 'Active') return false;
      if (activity === 'inactive' && collaborationStatus(dealer) === 'Active') return false;
      if (specialization && !dealer.configurations.some((item) => item.toLowerCase().includes(specialization.toLowerCase()))) return false;
      if (projectId && !workspace.access.some((row) => row.dealerId === dealer.id && row.projectId === projectId)) return false;
      return dealer.openLeads < dealer.capacity || activity !== 'capacity';
    });
  }, [workspace, locality, propertyType, transaction, verification, activity, specialization, projectId]);

  if (!workspace) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Dealer network</h2>
        <p className="text-sm text-muted-foreground">Response figures come from recorded assignments. Buyer contact details are not shown here.</p>
      </div>
      {!workspace.dealers.length && (
        <p className="rounded-xl border px-4 py-6 text-sm text-muted-foreground">No dealers yet. Add the first dealer below, then grant project access before any lead can be assigned.</p>
      )}
      <div className="grid gap-2 md:grid-cols-4">
        <Input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Locality" aria-label="Filter locality" />
        <Input value={propertyType} onChange={(event) => setPropertyType(event.target.value)} placeholder="Property type" aria-label="Filter property type" />
        <Input value={transaction} onChange={(event) => setTransaction(event.target.value)} placeholder="Transaction type" aria-label="Filter transaction" />
        <Input value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder="Configuration" aria-label="Filter specialization" />
        <select className={fieldClass} value={verification} onChange={(event) => setVerification(event.target.value)} aria-label="Verification">
          <option value="">Any verification</option>
          <option value="verified">Verified</option>
          <option value="unverified">Not verified</option>
        </select>
        <select className={fieldClass} value={activity} onChange={(event) => setActivity(event.target.value)} aria-label="Activity">
          <option value="">Active and inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive or suspended</option>
          <option value="capacity">Has capacity</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {dealers.map((dealer) => {
          const access = workspace.access.filter((row) => row.dealerId === dealer.id);
          const rate = dealerResponseRate(dealer);
          return (
            <article key={dealer.id} className="space-y-2 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{dealer.name}</p>
                  <p className="text-sm text-muted-foreground">{dealer.agencyName}</p>
                </div>
                <Badge variant="outline">{collaborationStatus(dealer)}</Badge>
              </div>
              <p className="text-sm">Areas: {dealer.localities.join(', ') || '—'}{dealer.nearbyLocalities.length ? ` · nearby ${dealer.nearbyLocalities.join(', ')}` : ''}</p>
              <p className="text-sm">Specialization: {dealer.propertyTypes.join(', ')} · {dealer.configurations.join(', ')} · {dealer.transactionTypes.join(', ')}</p>
              <p className="text-sm">Project access: {access.map((row) => workspace.projects.find((project) => project.id === row.projectId)?.name).filter(Boolean).join(', ') || 'None'}</p>
              <p className="text-sm">{dealer.verified ? 'Verified on platform records' : 'Not verified'} · Last activity {when(dealer.lastActivityAt)}</p>
              <p className="text-sm">
                Response: {rate == null ? `No recorded responses in ${dealer.responseWindowDays} days` : `${dealer.responsesInWindow} of ${dealer.assignmentsInWindow} answered`}
                {' '}· {dealer.openLeads} assigned / capacity {dealer.capacity}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => run({ type: 'set_dealer_preference', dealerId: dealer.id, projectId: projectId || workspace.projects[0]?.id || '', preferred: !dealer.preferredProjectIds.includes(projectId || workspace.projects[0]?.id || '') })}>
                  {dealer.preferredProjectIds.length ? 'Preference set' : 'Prefer for project'}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <section className="space-y-3 rounded-xl border p-4">
        <h3 className="font-medium">Grant access</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <select className={fieldClass} value={grantDealer} onChange={(event) => setGrantDealer(event.target.value)} aria-label="Dealer">
            <option value="">Dealer</option>
            {workspace.dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}
          </select>
          <select className={fieldClass} value={grantProject} onChange={(event) => setGrantProject(event.target.value)} aria-label="Project access">
            <option value="">Project</option>
            {workspace.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {ACCESS_PERMISSIONS.map((permission) => (
            <label key={permission} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))}
              />
              {permission}
            </label>
          ))}
        </div>
        <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} aria-label="Access expiration" />
        <Button type="button" disabled={!grantDealer || !grantProject} onClick={() => run({ type: 'grant_access', access: { projectId: grantProject, dealerId: grantDealer, permissions, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null } })}>Grant access</Button>
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" aria-label="Group name" />
          <div className="flex flex-wrap gap-2 text-sm">
            {workspace.dealers.map((dealer) => (
              <label key={dealer.id} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={groupDealers.includes(dealer.id)}
                  onChange={(event) => setGroupDealers((current) => event.target.checked ? [...current, dealer.id] : current.filter((id) => id !== dealer.id))}
                />
                {dealer.name}
              </label>
            ))}
          </div>
          <Input value={campaign} onChange={(event) => setCampaign(event.target.value)} placeholder="Campaign" aria-label="Campaign" />
        </div>
        <Button type="button" variant="outline" onClick={() => run({ type: 'create_group', name: groupName, dealerIds: groupDealers, campaignName: campaign || null })}>Create dealer group</Button>
        <div className="flex flex-wrap gap-2">
          {workspace.groups.map((group) => (
            <Button key={group.id} type="button" size="sm" variant="outline" disabled={!grantProject} onClick={() => run({ type: 'grant_access', access: { projectId: grantProject, groupId: group.id, permissions, campaignName: group.campaignName, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null } })}>
              Grant {group.name}{group.campaignName ? ` · ${group.campaignName}` : ''}
            </Button>
          ))}
        </div>
        <ul className="space-y-1 text-sm">
          {workspace.access.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2">
              <span>{workspace.dealers.find((dealer) => dealer.id === row.dealerId)?.name} · {workspace.projects.find((project) => project.id === row.projectId)?.name} · {row.permissions.join(', ')}{row.expiresAt ? ` · until ${when(row.expiresAt)}` : ''}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => run({ type: 'revoke_access', id: row.id })}>Remove</Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3 rounded-xl border p-4">
        <h3 className="font-medium">Add a dealer record</h3>
        <p className="text-sm text-muted-foreground">Response history starts empty. It is filled from assignments on this platform, not typed in.</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Dealer name" />
          <Input value={agency} onChange={(event) => setAgency(event.target.value)} placeholder="Agency" aria-label="Agency" />
          <Input value={areas} onChange={(event) => setAreas(event.target.value)} placeholder="Localities, comma separated" aria-label="Localities" />
          <Input value={configs} onChange={(event) => setConfigs(event.target.value)} placeholder="Configurations" aria-label="Configurations" />
        </div>
        <Button
          type="button"
          onClick={() => run({
            type: 'save_dealer',
            dealer: {
              name,
              agencyName: agency,
              active: true,
              suspended: false,
              localities: areas.split(','),
              nearbyLocalities: [],
              propertyTypes: ['residential'],
              configurations: configs.split(','),
              transactionTypes: ['sale'],
              budgetMin: null,
              budgetMax: null,
              optedOutLeadTypes: [],
              capacity: 5,
              responseWindowDays: 30,
            },
          })}
        >
          Save dealer
        </Button>
      </section>
    </div>
  );
}
