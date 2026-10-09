export interface AiPublicStatus {
  mode: 'live';
  configured: boolean;
  verified: boolean;
  label: string;
  provider: string;
  model: string | null;
  setupGuidance: string | null;
}

export interface LlmRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface LlmCompletion {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export type LlmFailureReason = 'not_configured' | 'timeout' | 'http_error' | 'network' | 'empty';

const SAFE_MESSAGES: Record<LlmFailureReason, string> = {
  not_configured: 'AI provider not configured.',
  timeout: 'The AI provider took too long to respond.',
  http_error: 'The AI provider returned an error.',
  network: 'The AI provider could not be reached.',
  empty: 'The AI provider returned an empty answer.',
};

export class LlmUnavailableError extends Error {
  constructor(
    readonly reason: LlmFailureReason,
    readonly httpStatus: number | null = null,
  ) {
    super(SAFE_MESSAGES[reason]);
  }
}

/** Vendor-neutral model interface. Controllers and tools depend on this, never on a vendor SDK. */
export interface LlmProvider {
  readonly id: string;
  status(): AiPublicStatus;
  testConnection(): Promise<{ ok: boolean; detail: string }>;
  complete(request: LlmRequest): Promise<LlmCompletion>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export const AI_SETUP_GUIDANCE =
  'Set AI_PROVIDER to ollama (local Qwen, no API key), huggingface/hf, or openai-compatible. For Ollama: AI_BASE_URL defaults to http://localhost:11434 and AI_MODEL defaults to qwen3:8b. For Hugging Face set HF_TOKEN and AI_MODEL. Restart the API, then use Test connection on Settings → AI. See docs/copilot.md.';
