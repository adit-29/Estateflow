import { DEMO_ENABLED } from './demo-policy';

const MODE_KEY = 'ef_workspace_mode';

export type WorkspaceMode = 'demo' | 'live';

export function getWorkspaceMode(): WorkspaceMode | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(MODE_KEY);
  if (value === 'live') return 'live';
  return value === 'demo' && DEMO_ENABLED ? 'demo' : null;
}

export function setWorkspaceMode(mode: WorkspaceMode) {
  if (mode === 'demo' && !DEMO_ENABLED) return;
  localStorage.setItem(MODE_KEY, mode);
}

export function clearWorkspaceMode() {
  localStorage.removeItem(MODE_KEY);
}

/** Live mode must never read the fictional demo store. Production builds never use it. */
export function usesDemoStore(mode: WorkspaceMode | null): boolean {
  return DEMO_ENABLED && mode === 'demo';
}
