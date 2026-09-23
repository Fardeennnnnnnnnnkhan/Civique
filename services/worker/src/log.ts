export function logEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'worker', ...event }));
}

export function safeErrorType(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
