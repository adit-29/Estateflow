'use client';

import { useEffect, useState } from 'react';
import { getWorkspaceMode, usesDemoStore } from '@/lib/workspace';

export function useLiveMode() {
  const [state, setState] = useState<'loading' | 'demo' | 'live'>('loading');
  useEffect(() => {
    setState(usesDemoStore(getWorkspaceMode()) ? 'demo' : 'live');
  }, []);
  return state;
}
