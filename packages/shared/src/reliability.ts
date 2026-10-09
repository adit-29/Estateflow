const SECRET_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'cookie',
  'phone',
  'email',
]);

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const size = Math.min(Math.max(pageSize, 1), 50);
  const current = Math.max(page, 1);
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, pageSize: size, total: items.length };
}

export function redactLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactLog(item));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[redacted]' : redactLog(nested);
  }
  return out;
}

export function publicErrorMessage(status: number, message?: string): string {
  if (status >= 500) return 'Something went wrong. Try again.';
  if (!message) return 'Request could not be completed.';
  return message.slice(0, 200);
}
