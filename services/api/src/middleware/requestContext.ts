import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function normalizeRequestId(value: unknown): string {
  if (typeof value === 'string' && REQUEST_ID_PATTERN.test(value)) return value;
  return randomUUID();
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const requestId = normalizeRequestId(req.header('x-request-id'));
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.once('finish', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'api',
      module: 'http',
      operation: 'request',
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });
  next();
}
