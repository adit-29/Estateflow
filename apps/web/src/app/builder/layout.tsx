'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Box, Bot, Building2, FolderKanban, LayoutDashboard, ScrollText, Settings, Users, UserSearch } from 'lucide-react';
import { builderNotifications } from '@estateflow/shared';
import { AppShell, type NavGroup, type NavItem } from '@/features/shell/app-shell';
import { BuilderWorkspaceProvider, useBuilderWorkspace } from '@/features/builder/builder-context';
import { fieldClass } from '@/features/builder/format';

const navGroups: NavGroup[] = [
  {
    label: 'Work',
    items: [
      { href: '/builder', label: 'Overview', icon: LayoutDashboard },
      { href: '/builder/projects', label: 'Projects', icon: FolderKanban },
      { href: '/builder/inventory', label: 'Inventory', icon: Building2 },
      { href: '/builder/3d-tours', label: '3D tours', icon: Box },
    ],
  },
  {
    label: 'Network',
    items: [
      { href: '/builder/dealers', label: 'Dealers', icon: Users },
      { href: '/builder/leads', label: 'Leads', icon: UserSearch },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/builder/copilot', label: 'Copilot', icon: Bot },
      { href: '/builder/audit', label: 'Audit', icon: ScrollText },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/builder/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const bottomNav: NavItem[] = [
  { href: '/builder', label: 'Home', icon: LayoutDashboard },
  { href: '/builder/projects', label: 'Projects', icon: FolderKanban },
  { href: '/builder/leads', label: 'Leads', icon: UserSearch },
  { href: '/builder/copilot', label: 'Copilot', icon: Bot },
];

function BuilderFrame({ children }: { children: React.ReactNode }) {
  const { workspace, error, mode, projectId, setProjectId } = useBuilderWorkspace();
  const router = useRouter();
  const notices = workspace ? builderNotifications(workspace) : [];
  return (
    <AppShell role="builder" navGroups={navGroups} bottomNav={bottomNav} title="Builder workspace">
      {mode === 'demo' && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
          <span className="font-semibold">DEMO DATA.</span> Fictional projects, dealers, and an illustrative 3D scene. Nothing here is a live reconstruction or a public listing.
        </div>
      )}
      {workspace?.storageMode === 'metadata_only' && mode === 'live' && (
        <div className="mb-4 rounded-lg border px-4 py-2 text-sm text-muted-foreground">
          Private object storage is not configured. Media records keep file details only, and bytes are not stored in the database.
        </div>
      )}
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</p>}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground" htmlFor="project-selector">Project</label>
        <select
          id="project-selector"
          className={`${fieldClass} max-w-xs`}
          value={projectId ?? ''}
          onChange={(event) => setProjectId(event.target.value)}
        >
          <option value="">All projects</option>
          {workspace?.projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <form
          className="flex-1 min-w-[12rem]"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const q = String(data.get('q') ?? '').trim();
            router.push(q ? `/builder/search?q=${encodeURIComponent(q)}` : '/builder/search');
          }}
        >
          <input name="q" placeholder="Search projects, units, dealers, leads" className={fieldClass} aria-label="Search the builder workspace" />
        </form>
        <Link href="/builder/notifications" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Bell className="h-4 w-4" />
          {notices.length}
        </Link>
        <Link href="/builder/settings" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
      {children}
    </AppShell>
  );
}

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <BuilderWorkspaceProvider>
      <BuilderFrame>{children}</BuilderFrame>
    </BuilderWorkspaceProvider>
  );
}
