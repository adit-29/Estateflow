'use client';

import { DEMO_SEED_REVISION, createDemoBuilderWorkspace, type BuilderWorkspace } from '@estateflow/shared';

const KEY = 'ef_builder_workspace_v1';

export function loadDemoBuilderWorkspace(): BuilderWorkspace {
  if (typeof window === 'undefined') return createDemoBuilderWorkspace();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDemoBuilderWorkspace();
    const parsed = JSON.parse(raw) as BuilderWorkspace;
    if (parsed?.version !== 1 || parsed.demoRevision !== DEMO_SEED_REVISION || parsed.dataSource !== 'demo' || !Array.isArray(parsed.projects)) return createDemoBuilderWorkspace();
    return parsed;
  } catch {
    return createDemoBuilderWorkspace();
  }
}

export function saveDemoBuilderWorkspace(workspace: BuilderWorkspace) {
  localStorage.setItem(KEY, JSON.stringify(workspace));
}

export function resetDemoBuilderWorkspace(): BuilderWorkspace {
  localStorage.removeItem(KEY);
  const fresh = createDemoBuilderWorkspace();
  saveDemoBuilderWorkspace(fresh);
  return fresh;
}
