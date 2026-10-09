import { readAiConfig } from './configured-llm.provider';

export type CopilotServerMode = 'live' | 'rejected';

/** Browser-supplied mode, role, and tenant id are ignored. */
export function resolveCopilotMode(input: {
  authenticated: boolean;
  role: string | null;
}): { mode: CopilotServerMode; reason?: string } {
  if (!input.authenticated) {
    return { mode: 'rejected', reason: 'Authentication required' };
  }
  if (input.role !== 'dealer') {
    return { mode: 'rejected', reason: 'Dealer role required' };
  }
  return { mode: 'live' };
}

export function publicAiStatus() {
  const cfg = readAiConfig();
  return {
    mode: 'live' as const,
    configured: cfg.configured,
    label: cfg.configured ? `Configured · ${cfg.model}` : 'AI provider not configured',
    provider: cfg.configured ? cfg.provider : 'not_configured',
    model: cfg.configured ? cfg.model : null,
  };
}
