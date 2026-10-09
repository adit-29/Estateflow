import { describe, expect, it } from 'vitest';
import { appEnv, integrationSetup, productionSafetyViolations } from '../src/config/runtime-env';
import { migrationReadiness } from '../src/health.controller';

const strong = 'x'.repeat(40);
const prodOk = {
  APP_ENV: 'production',
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/estateflow?schema=public&sslmode=require',
  CORS_ORIGIN: 'https://app.example.com',
  AUTH_PROVIDER: 'cognito',
};

describe('runtime environment', () => {
  it('fails safe to production when NODE_ENV=production and APP_ENV is missing', () => {
    expect(appEnv({ NODE_ENV: 'production' })).toBe('production');
    expect(appEnv({})).toBe('local');
    expect(appEnv({ APP_ENV: 'staging', NODE_ENV: 'production' })).toBe('staging');
  });

  it('lets local development run without AWS or secrets', () => {
    expect(productionSafetyViolations({})).toEqual([]);
    expect(productionSafetyViolations({ APP_ENV: 'local', NOTIFICATION_SINK: 'local' })).toEqual([]);
  });

  it('accepts a correctly configured production environment', () => {
    expect(productionSafetyViolations(prodOk)).toEqual([]);
  });

  it('blocks local auth, demo seed, dev sinks, static keys, and plaintext DB in production', () => {
    const v = productionSafetyViolations({
      ...prodOk,
      AUTH_PROVIDER: 'local',
      LOCAL_AUTH_SECRET: 'change-me-in-development-only',
      SEED_DEMO_DATA: 'true',
      NOTIFICATION_SINK: 'local',
      AWS_ACCESS_KEY_ID: 'AKIA...',
      DATABASE_URL: 'postgresql://u:p@db:5432/estateflow',
      CORS_ORIGIN: 'http://localhost:3000',
    }).join(' ');
    for (const key of ['AUTH_PROVIDER', 'LOCAL_AUTH_SECRET', 'SEED_DEMO_DATA', 'NOTIFICATION_SINK', 'AWS_ACCESS_KEY_ID', 'sslmode', 'CORS_ORIGIN']) {
      expect(v).toContain(key);
    }
    expect(v).not.toContain('AKIA');
  });

  it('allows staging on local auth only with a strong secret', () => {
    const staging = { ...prodOk, APP_ENV: 'staging', AUTH_PROVIDER: 'local' };
    expect(productionSafetyViolations({ ...staging, LOCAL_AUTH_SECRET: 'short' }).join(' ')).toContain('LOCAL_AUTH_SECRET');
    expect(productionSafetyViolations({ ...staging, LOCAL_AUTH_SECRET: strong })).toEqual([]);
  });

  it('requires a webhook secret before a reconstruction provider can be selected', () => {
    expect(productionSafetyViolations({ ...prodOk, RECONSTRUCTION_PROVIDER: 'acme' }).join(' ')).toContain('RECONSTRUCTION_WEBHOOK_SECRET');
  });

  it('reports setup states without ever returning values', () => {
    const env = { AI_PROVIDER: 'openai-compatible', AI_BASE_URL: 'https://llm', AI_API_KEY: 'sk-secret-value', AI_MODEL: 'm', S3_BUCKET: 'b', S3_REGION: 'ap-south-1' };
    const setup = integrationSetup(env);
    expect(JSON.stringify(setup)).not.toContain('sk-secret-value');
    const byKey = Object.fromEntries(setup.map((s) => [s.key, s.state]));
    expect(byKey).toMatchObject({ llm: 'configured_unverified', storage: 'configured_unverified', whatsapp: 'not_configured', queue: 'not_implemented', reconstruction: 'not_configured', auth: 'local_only' });
    expect(setup.every((s) => s.state !== 'ready')).toBe(true);
  });

  it('treats Hugging Face as configured without AI_BASE_URL when HF_TOKEN and AI_MODEL are set', () => {
    const setup = integrationSetup({ AI_PROVIDER: 'huggingface', HF_TOKEN: 'hf-secret', AI_MODEL: 'Qwen/Qwen2.5-7B-Instruct' });
    expect(JSON.stringify(setup)).not.toContain('hf-secret');
    expect(setup.find((s) => s.key === 'llm')?.state).toBe('configured_unverified');
  });
});

describe('migration readiness', () => {
  const at = new Date();
  it('reports pending and failed migrations', () => {
    expect(migrationReadiness(['a', 'b'], [{ migration_name: 'a', finished_at: at, rolled_back_at: null }])).toMatchObject({ pending: ['b'], failed: [] });
    expect(migrationReadiness(['a'], [{ migration_name: 'a', finished_at: null, rolled_back_at: null }])).toMatchObject({ failed: ['a'], pending: ['a'] });
    expect(migrationReadiness(['a'], [{ migration_name: 'a', finished_at: at, rolled_back_at: null }])).toMatchObject({ pending: [], failed: [] });
  });
});
