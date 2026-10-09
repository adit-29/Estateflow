import { Injectable } from '@nestjs/common';
import { readAiConfig } from './configured-llm.provider';
import { AI_SETUP_GUIDANCE, LlmUnavailableError, type AiPublicStatus, type LlmCompletion, type LlmProvider, type LlmRequest } from './llm-provider';

type Env = Record<string, string | undefined>;

/** Native Ollama `/api/chat` adapter. Request/response translation stays in this class. */
@Injectable()
export class ConfiguredOllamaProvider implements LlmProvider {
  readonly id = 'ollama';
  private verifiedAt: Date | null = null;
  fetchImpl: typeof fetch = (input, init) => fetch(input, init);
  env: Env = process.env;

  status(): AiPublicStatus {
    const cfg = readAiConfig(this.env);
    const configured = cfg.configured && cfg.provider === 'ollama';
    const verified = configured && this.verifiedAt !== null;
    return {
      mode: 'live',
      configured,
      verified,
      label: !configured ? 'AI provider not configured' : verified ? `Live · ${cfg.model}` : 'Configured · not yet verified',
      provider: configured ? 'ollama' : 'not_configured',
      model: configured ? cfg.model : null,
      setupGuidance: configured ? null : AI_SETUP_GUIDANCE,
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
    if (!cfg.configured || cfg.provider !== 'ollama' || !cfg.model) throw new LlmUnavailableError('not_configured');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${cfg.baseUrl}/api/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.model,
          stream: false,
          options: { num_predict: Math.min(request.maxTokens ?? cfg.maxOutputTokens, cfg.maxOutputTokens) },
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
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    } | null;
    const text = body?.message?.content?.trim();
    if (!text) throw new LlmUnavailableError('empty');
    this.verifiedAt = new Date();
    return {
      text,
      inputTokens: body?.prompt_eval_count ?? null,
      outputTokens: body?.eval_count ?? null,
    };
  }
}
