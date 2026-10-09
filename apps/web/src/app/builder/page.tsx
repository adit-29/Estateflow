'use client';

import Link from 'next/link';
import { builderKpis, PROJECT_STATUS_LABEL, qualitySignals } from '@estateflow/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, MetricCard } from '@/components/ux';
import { useBuilderWorkspace } from '@/features/builder/builder-context';

export default function BuilderHomePage() {
  const { workspace, mode, projectId } = useBuilderWorkspace();
  if (mode === 'loading' || !workspace) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>;
  }
  const kpis = builderKpis(workspace, { projectId: projectId || null });
  const rate = kpis.dealerResponseRate == null ? 'No recorded responses' : `${Math.round(kpis.dealerResponseRate * 100)}%`;
  const projects = workspace.projects.filter((project) => !projectId || project.id === projectId);
  const unassigned = workspace.leads.filter((lead) => lead.stage === 'new_lead' && (!projectId || lead.projectId === projectId));
  const assigned = workspace.assignments.filter((row) => row.status === 'assigned');
  const accepted = workspace.assignments.filter((row) => row.status === 'accepted');
  const declined = workspace.assignments.filter((row) => row.status === 'declined' || row.status === 'timed_out');
  const alerts = qualitySignals(workspace).slice(0, 6);
  const source = mode === 'demo' ? 'demo records' : 'this builder organization';

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">Builder desk</p>
            <h2 className="mt-1 text-2xl font-bold">How are my projects selling?</h2>
            <p className="mt-1 text-sm text-white/85">Figures are counted from {source}. Empty live accounts stay empty — demo records are not copied in.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/40 bg-white/15 text-white hover:bg-white/25"><Link href="/builder/leads">Review buyer leads</Link></Button>
            <Button asChild className="bg-white text-indigo-800 hover:bg-white/90"><Link href="/builder/projects/new">Create project</Link></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard tone="indigo" label="Active projects" value={kpis.activeProjects} definition={`Projects marked active in ${source}.`} href="/builder/projects" />
        <MetricCard tone="teal" label="Available units" value={kpis.availableUnits} definition="Units whose stored availability is available." href="/builder/inventory" />
        <MetricCard tone="amber" label="Booked" value={kpis.bookedUnits} definition="Units currently stored as booked." href="/builder/inventory" />
        <MetricCard tone="violet" label="Sold" value={kpis.soldUnits} definition="Units currently stored as sold." href="/builder/inventory" />
        <MetricCard tone="sky" label="New enquiries" value={kpis.newLeads} definition="Leads still in the new-lead stage." href="/builder/leads" />
        <MetricCard tone="orange" label="Visits this week" value={kpis.visitsThisWeek} definition="Leads with a visit timestamp in the last seven days." href="/builder/leads" />
        <MetricCard tone="rose" label="Pending assignments" value={kpis.pendingLeadAssignments} definition="Assignments waiting for a dealer response." href="/builder/leads/routing" />
        <MetricCard tone="indigo" label="3D tours ready" value={kpis.toursReady} definition="Tours in ready, approved, or published. Demo scenes are labelled." href="/builder/3d-tours" />
        <MetricCard tone="sky" label="3D tours processing" value={kpis.toursProcessing} definition="Queued or processing jobs. Live processing needs a configured provider." href="/builder/3d-tours" />
        <MetricCard tone="amber" label="On hold" value={kpis.unitsOnHold} definition="Units currently stored as on hold." href="/builder/inventory" />
        <MetricCard tone="teal" label="Dealer response rate" value={rate} definition="Accepted or declined assignments in the last 30 days, divided by decided assignments." href="/builder/dealers" />
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-medium">Sales health</h3>
        {!projects.length && (
          <EmptyState
            title="No projects yet"
            body="Create a project to add towers, units, and dealer access. Demo records are not loaded into a real account."
            action={{ href: '/builder/projects/new', label: 'Create your first project' }}
          />
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => {
            const units = workspace.units.filter((unit) => unit.projectId === project.id);
            const leads = workspace.leads.filter((lead) => lead.projectId === project.id);
            const visits = leads.filter((lead) => Boolean(lead.visitAt)).length;
            const bookings = units.filter((unit) => unit.availability === 'booked' || unit.availability === 'sold').length;
            return (
              <Link key={project.id} href={`/builder/projects/${project.id}`} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm hover:brightness-95">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.locality}, {project.city}</p>
                  </div>
                  <Badge variant="outline">{PROJECT_STATUS_LABEL[project.status]}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {units.filter((unit) => unit.availability === 'available').length} available · {leads.length} leads · {visits} visits · {bookings} booked/sold
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{project.visibility === 'public' ? 'Public listing' : 'Not a public listing'} · {project.developerName}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Lead routing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Unassigned: {unassigned.length}</p>
            <p>Assigned, waiting: {assigned.length}</p>
            <p>Accepted: {accepted.length}</p>
            <p>Declined or timed out: {declined.length}</p>
            <Button asChild size="sm" className="mt-2"><Link href="/builder/leads/routing">Open assignment board</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Inventory alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">No verification signals on the current records.</p>}
            {alerts.map((alert) => (
              <Link key={`${alert.code}-${alert.detail}`} href={alert.href} className="block rounded-lg border p-3 text-sm hover:bg-muted/40">
                <p className="font-medium">{alert.label}</p>
                <p className="text-muted-foreground">{alert.detail}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="text-base font-medium">Dealer network</h3>
        <p className="mt-1 text-sm text-muted-foreground">{workspace.dealers.filter((dealer) => dealer.active && !dealer.suspended).length} active dealers on file · {kpis.pendingLeadAssignments} open assignments</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link href="/builder/dealers">Manage dealer access</Link></Button>
          <Button asChild variant="outline"><Link href="/builder/leads">Assign a buyer lead</Link></Button>
        </div>
      </section>
    </div>
  );
}
