export interface ErrorContext {
  requestId?: string | null;
  method?: string;
  path?: string;
  status: number;
}

/** Hook for an error-monitoring vendor. The default writes one structured line that a CloudWatch metric filter counts. */
export interface ErrorReporter {
  report(error: unknown, context: ErrorContext): void;
}

export const structuredLogReporter: ErrorReporter = {
  report(error, context) {
    const err = error instanceof Error ? error : null;
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'unhandled_error',
        ts: new Date().toISOString(),
        ...context,
        name: err?.name ?? 'Error',
        message: err?.message?.slice(0, 300) ?? null,
        stack: err?.stack?.split('\n').slice(0, 8).join('\n') ?? null,
      }),
    );
  },
};

let active: ErrorReporter = structuredLogReporter;

export function setErrorReporter(reporter: ErrorReporter) {
  active = reporter;
}

export function reportError(error: unknown, context: ErrorContext) {
  try {
    active.report(error, context);
  } catch {
    // A broken reporter must never turn one error into two.
  }
}
