export type AppEnv = 'local' | 'staging' | 'production';

const DEFAULT_LOCAL_SECRET = 'change-me-in-development-only';

/** APP_ENV wins. Without it, NODE_ENV=production is treated as production so a missing value fails safe. */
export function appEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const raw = env.APP_ENV?.trim().toLowerCase();
  if (raw === 'local' || raw === 'staging' || raw === 'production') return raw;
  return env.NODE_ENV === 'production' ? 'production' : 'local';
}

function isLocalhost(value: string) {
  return /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(value);
}

/** Configuration that must stop the API from starting. Messages name variables, never values. */
export function productionSafetyViolations(env: NodeJS.ProcessEnv = process.env): string[] {
  const stage = appEnv(env);
  const raw = env.APP_ENV?.trim();
  const out: string[] = [];
  if (raw && !['local', 'staging', 'production'].includes(raw.toLowerCase())) out.push('APP_ENV must be local, staging, or production.');
  if (stage === 'local') return out;

  if (!env.DATABASE_URL) out.push('DATABASE_URL is required.');
  const cors = env.CORS_ORIGIN?.trim();
  if (!cors || isLocalhost(cors)) out.push('CORS_ORIGIN must be the deployed web origin, not localhost.');
  if (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY) out.push('Remove AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. Deployed tasks use their IAM role.');
  if (env.NOTIFICATION_SINK === 'local') out.push('NOTIFICATION_SINK=local is a development sink and cannot run outside local.');
  const provider = env.RECONSTRUCTION_PROVIDER?.trim();
  if (provider && provider !== 'mock' && provider !== 'none' && !env.RECONSTRUCTION_WEBHOOK_SECRET) {
    out.push('RECONSTRUCTION_WEBHOOK_SECRET is required when RECONSTRUCTION_PROVIDER is set.');
  }

  const authProvider = env.AUTH_PROVIDER ?? 'local';
  if (authProvider === 'local') {
    const secret = env.LOCAL_AUTH_SECRET ?? '';
    if (!secret || secret === DEFAULT_LOCAL_SECRET || secret.length < 32) out.push('LOCAL_AUTH_SECRET must be a unique value of at least 32 characters.');
  }

  if (stage === 'production') {
    if (authProvider !== 'cognito') out.push('AUTH_PROVIDER must be cognito in production. Local password auth is for local and staging only.');
    if (env.DATABASE_URL && !/[?&]sslmode=(require|verify-ca|verify-full)\b/.test(env.DATABASE_URL)) {
      out.push('DATABASE_URL must set sslmode=require (or verify-full) in production.');
    }
    if (env.SEED_DEMO_DATA === 'true') out.push('SEED_DEMO_DATA cannot be enabled in production.');
  }
  return out;
}

export function assertSafeRuntime(env: NodeJS.ProcessEnv = process.env) {
  const violations = productionSafetyViolations(env);
  if (violations.length === 0) return;
  console.error(JSON.stringify({ level: 'fatal', event: 'unsafe_runtime_config', appEnv: appEnv(env), violations }));
  throw new Error(`Refusing to start (${appEnv(env)}): ${violations.join(' ')}`);
}

export type SetupState = 'not_configured' | 'configured_unverified' | 'not_implemented' | 'local_only' | 'ready';

export interface IntegrationSetup {
  key: 'auth' | 'llm' | 'whatsapp' | 'storage' | 'queue' | 'reconstruction' | 'notifications';
  name: string;
  state: SetupState;
  label: string;
  requiredEnv: string[];
  note: string;
}

/**
 * Presence checks only. "configured_unverified" never means connected; the owning feature
 * performs its own health check or webhook verification before claiming that.
 */
export function integrationSetup(env: NodeJS.ProcessEnv = process.env): IntegrationSetup[] {
  const has = (...keys: string[]) => keys.every((k) => Boolean(env[k]?.trim()));
  const authCognito = env.AUTH_PROVIDER === 'cognito';
  const provider = env.AI_PROVIDER?.trim();
  const aiOn = Boolean(provider && provider !== 'mock');
  const huggingface = provider === 'huggingface' || provider === 'hf';
  const ollama = provider === 'ollama';
  const llmKey = ollama || Boolean(env.AI_API_KEY?.trim() || (huggingface && env.HF_TOKEN?.trim()));
  const llmBase = Boolean(env.AI_BASE_URL?.trim() || huggingface || ollama);
  const llmReady = aiOn && llmBase && llmKey && (ollama || has('AI_MODEL'));
  const reconName = env.RECONSTRUCTION_PROVIDER?.trim();
  const reconOn = Boolean(reconName && reconName !== 'mock' && reconName !== 'none');
  return [
    {
      key: 'auth',
      name: 'Amazon Cognito',
      state: authCognito ? 'not_implemented' : 'local_only',
      label: authCognito ? 'Selected · adapter not implemented' : 'Local password auth (not for production)',
      requiredEnv: ['AUTH_PROVIDER=cognito', 'COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID', 'COGNITO_REGION'],
      note: 'The Cognito provider class refuses sign-in until token verification is written and tested.',
    },
    {
      key: 'llm',
      name: 'Live copilot LLM',
      state: llmReady ? 'configured_unverified' : 'not_configured',
      label: llmReady ? 'Configured · run the test in Settings → AI' : 'AI provider not configured',
      requiredEnv: ollama
        ? ['AI_PROVIDER=ollama', 'AI_BASE_URL (defaults to http://localhost:11434)', 'AI_MODEL (defaults to qwen3:8b)']
        : huggingface
        ? ['AI_PROVIDER=huggingface', 'HF_TOKEN or AI_API_KEY', 'AI_MODEL']
        : ['AI_PROVIDER', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL'],
      note: 'Ollama uses /api/chat with stream:false. Hugging Face uses https://router.huggingface.co/v1 when AI_BASE_URL is empty. Settings → AI runs a live test call before Copilot shows as live.',
    },
    {
      key: 'whatsapp',
      name: 'Meta WhatsApp Cloud API',
      state: has('WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'META_APP_SECRET') ? 'configured_unverified' : 'not_configured',
      label: has('WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'META_APP_SECRET')
        ? 'Credentials present · waiting for a signed webhook'
        : 'Not connected',
      requiredEnv: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'META_APP_SECRET'],
      note: 'The inbox shows Connected only after a signed webhook arrives.',
    },
    {
      key: 'storage',
      name: 'Private S3 media bucket',
      state: has('S3_BUCKET') && (has('S3_REGION') || has('AWS_REGION')) ? 'configured_unverified' : 'not_configured',
      label: has('S3_BUCKET') && (has('S3_REGION') || has('AWS_REGION')) ? 'Bucket configured · verified on first upload' : 'Private storage not configured',
      requiredEnv: ['S3_BUCKET', 'S3_REGION'],
      note: 'Uploads use presigned URLs signed by the task role. Real tour uploads are disabled without it.',
    },
    {
      key: 'queue',
      name: 'SQS background jobs',
      state: 'not_implemented',
      label: 'Background worker not implemented',
      requiredEnv: ['NOTIFICATION_QUEUE_URL'],
      note: 'No worker consumes SQS yet. Notifications are delivered in-request and reported as "background delivery unavailable".',
    },
    {
      key: 'reconstruction',
      name: '3D reconstruction provider',
      state: reconOn && has('RECONSTRUCTION_API_KEY') ? 'not_implemented' : 'not_configured',
      label: reconOn && has('RECONSTRUCTION_API_KEY') ? 'Configured · vendor adapter not implemented' : 'Reconstruction provider not configured',
      requiredEnv: ['RECONSTRUCTION_PROVIDER', 'RECONSTRUCTION_API_KEY', 'RECONSTRUCTION_WEBHOOK_SECRET'],
      note: 'No vendor is selected. See docs/reconstruction-provider.md.',
    },
    {
      key: 'notifications',
      name: 'Email / SMS / push delivery',
      state: env.NOTIFICATION_SINK === 'local' ? 'local_only' : 'not_configured',
      label: env.NOTIFICATION_SINK === 'local' ? 'Local development sink · nothing is sent' : 'No delivery adapter configured',
      requiredEnv: [],
      note: 'No real email, SMS, or push adapter ships in this build.',
    },
  ];
}
