import { Injectable } from '@nestjs/common';
import { AI_SETUP_GUIDANCE, LlmUnavailableError, type AiPublicStatus, type LlmCompletion, type LlmProvider, type LlmRequest } from './llm-provider';

type Env = Record<string, string | undefined>;

export function readAiConfig(env: Env = process.env) {
  const providerRaw = env.AI_PROVIDER?.trim() || 'mock';
  const provider = providerRaw === 'hf' ? 'huggingface' : providerRaw;
  const huggingface = provider === 'huggingface';
  const ollama = provider === 'ollama';
  const apiKey = env.AI_API_KEY?.trim() || (huggingface ? env.HF_TOKEN?.trim() || '' : '');
  const model = (env.AI_MODEL?.trim() || (ollama ? 'qwen3:8b' : '')) || null;
  const defaultBase = huggingface ? 'https://router.huggingface.co/v1' : ollama ? 'http://localhost:11434' : '';
  const baseUrl = (env.AI_BASE_URL?.trim() || defaultBase).replace(/\/+$/, '');
  const needsKey = !ollama;
  return {
    provider,
    baseUrl,
    apiKey,
    model,
    configured: provider !== 'mock' && Boolean(baseUrl && model && (!needsKey || apiKey)),
    timeoutMs: Math.min(Math.max(Number(env.AI_REQUEST_TIMEOUT_MS ?? 30_000) || 30_000, 1_000), 120_000),
    maxOutputTokens: Math.min(Math.max(Number(env.AI_MAX_OUTPUT_TOKENS ?? 800) || 800, 16), 4_000),
  };
}

/** OpenAI-compatible /chat/completions adapter. Works with any vendor or gateway that exposes that API shape. */
@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly id = 'openai-compatible';
  private verifiedAt: Date | null = null;
  fetchImpl: typeof fetch = (input, init) => fetch(input, init);
  env: Env = process.env;

  status(): AiPublicStatus {
    const cfg = readAiConfig(this.env);
    const verified = cfg.configured && this.verifiedAt !== null;
    return {
      mode: 'live',
      configured: cfg.configured,
      verified,
      label: !cfg.configured ? 'AI provider not configured' : verified ? `Live · ${cfg.model}` : 'Configured · not yet verified',
      provider: cfg.configured ? cfg.provider : 'not_configured',
      model: cfg.configured ? cfg.model : null,
      setupGuidance: cfg.configured ? null : AI_SETUP_GUIDANCE,
    };
  }

  async testConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      await this.complete({ system: 'Health check.', user: 'Reply with ok.', maxTokens: 16 });
      return { ok: true, detail: `Connected to ${readAiConfig(this.env).model}.` };
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        const detail =
          error.reason === 'not_configured'
            ? `AI provider not configured. ${AI_SETUP_GUIDANCE}`
            : error.httpStatus
              ? `${error.message} (HTTP ${error.httpStatus}).`
              : error.message;
        return { ok: false, detail };
      }
      return { ok: false, detail: 'Connection test failed.' };
    }
  }

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    const cfg = readAiConfig(this.env);
    if (!cfg.configured || !cfg.model) throw new LlmUnavailableError('not_configured');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: Math.min(request.maxTokens ?? cfg.maxOutputTokens, cfg.maxOutputTokens),
          temperature: 0.2,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
        }),
      });
    } catch (error) {
      throw new LlmUnavailableError((error as Error)?.name === 'AbortError' ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new LlmUnavailableError('http_error', response.status);
    const body = (await response.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    } | null;
    const text = body?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new LlmUnavailableError('empty');
    this.verifiedAt = new Date();
    return {
      text,
      inputTokens: body?.usage?.prompt_tokens ?? null,
      outputTokens: body?.usage?.completion_tokens ?? null,
    };
  }
}
