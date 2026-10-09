import { describe, expect, it } from 'vitest';
import { publicAiStatus, resolveCopilotMode } from '../src/copilot/copilot-mode';

describe('copilot mode', () => {
  it('rejects unauthenticated requests even if the body claims live or demo', () => {
    expect(resolveCopilotMode({ authenticated: false, role: 'dealer' }).mode).toBe('rejected');
    expect(resolveCopilotMode({ authenticated: false, role: null }).mode).toBe('rejected');
  });

  it('rejects non-dealer roles', () => {
    expect(resolveCopilotMode({ authenticated: true, role: 'buyer' }).mode).toBe('rejected');
  });

  it('keeps an authenticated dealer in live mode', () => {
    expect(resolveCopilotMode({ authenticated: true, role: 'dealer' }).mode).toBe('live');
  });

  it('does not report a model name when the key is missing', () => {
    const previousKey = process.env.AI_API_KEY;
    const previousHf = process.env.HF_TOKEN;
    delete process.env.AI_API_KEY;
    delete process.env.HF_TOKEN;
    process.env.AI_PROVIDER = 'openai-compatible';
    process.env.AI_MODEL = 'secret-model';
    const status = publicAiStatus();
    expect(status.configured).toBe(false);
    expect(status.label).toBe('AI provider not configured');
    expect(status.model).toBeNull();
    expect(JSON.stringify(status)).not.toContain('sk-');
    if (previousKey) process.env.AI_API_KEY = previousKey;
    if (previousHf) process.env.HF_TOKEN = previousHf;
  });
});
