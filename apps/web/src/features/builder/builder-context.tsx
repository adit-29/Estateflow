'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BuilderRuleError, applyBuilderAction, type BuilderAction, type BuilderWorkspace } from '@estateflow/shared';
import { useLiveMode } from '@/components/use-live-mode';
import { api, ApiError } from '@/lib/api-client';
import { loadDemoBuilderWorkspace, resetDemoBuilderWorkspace, saveDemoBuilderWorkspace } from '@/lib/builder-workspace';

interface BuilderState {
  mode: 'loading' | 'demo' | 'live';
  workspace: BuilderWorkspace | null;
  error: string | null;
  projectId: string | null;
  setProjectId: (id: string) => void;
  run: (action: BuilderAction) => Promise<BuilderWorkspace | null>;
  resetDemo: () => void;
}

const BuilderContext = createContext<BuilderState | null>(null);

export function BuilderWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const mode = useLiveMode();
  const [workspace, setWorkspace] = useState<BuilderWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const workspaceRef = useRef<BuilderWorkspace | null>(null);
  workspaceRef.current = workspace;

  useEffect(() => {
    if (mode !== 'live') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      api.builderWorkspace()
        .then((loaded) => {
          workspaceRef.current = loaded;
          setWorkspace(loaded);
        })
        .catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (mode === 'loading') return;
    if (mode === 'demo') {
      const loaded = loadDemoBuilderWorkspace();
      setWorkspace(loaded);
      setProjectIdState((current) => current ?? loaded.projects[0]?.id ?? null);
      setError(null);
      return;
    }
    api.builderWorkspace()
      .then((loaded) => {
        setWorkspace(loaded);
        setProjectIdState((current) => current ?? loaded.projects[0]?.id ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        setWorkspace(null);
        setError(err instanceof ApiError ? err.message : 'The builder workspace could not be loaded.');
      });
  }, [mode]);

  const setProjectId = useCallback((id: string) => setProjectIdState(id), []);

  const run = useCallback(async (action: BuilderAction) => {
    setError(null);
    const current = workspaceRef.current;
    if (!current) return null;
    if (mode === 'demo') {
      try {
        const next = applyBuilderAction(current, action);
        saveDemoBuilderWorkspace(next);
        workspaceRef.current = next;
        setWorkspace(next);
        return next;
      } catch (err) {
        setError(err instanceof BuilderRuleError ? err.message : 'That change was rejected.');
        return null;
      }
    }
    try {
      const next = await api.builderAction(action);
      workspaceRef.current = next;
      setWorkspace(next);
      return next;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That change was rejected.');
      return null;
    }
  }, [mode]);

  const resetDemo = useCallback(() => {
    if (mode !== 'demo') return;
    const fresh = resetDemoBuilderWorkspace();
    setWorkspace(fresh);
    setProjectIdState(fresh.projects[0]?.id ?? null);
  }, [mode]);

  const value = useMemo(() => ({ mode, workspace, error, projectId, setProjectId, run, resetDemo }), [mode, workspace, error, projectId, setProjectId, run, resetDemo]);
  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilderWorkspace() {
  const value = useContext(BuilderContext);
  if (!value) throw new Error('Builder workspace is not available on this page');
  return value;
}
