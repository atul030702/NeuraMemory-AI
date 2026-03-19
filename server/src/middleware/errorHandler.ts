import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

type ErrorContext = {
  path: string;
  method: string;
  timestamp: string;
  requestId?: string;
};

function buildContext(req: Request): ErrorContext {
  const context: ErrorContext = {
    path: req.originalUrl ?? req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  const rawRequestId = req.headers['x-request-id'];
  if (typeof rawRequestId === 'string' && rawRequestId.trim().length > 0) {
    context.requestId = rawRequestId.trim();
  }

  return context;
}

function logError(
  level: 'warn' | 'error',
  message: string,
  meta: unknown,
): void {
  const payload = {
    level,
    message,
    ...((meta as Record<string, unknown>) ?? {}),
  };

  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
  } else {
    console.error(JSON.stringify(payload));
  }
}

function isBodyParserSyntaxError(
  err: unknown,
): err is Error & { status?: number; type?: string; body?: unknown } {
  if (!(err instanceof Error)) return false;
  const maybe = err as Error & {
    status?: number;
    type?: string;
    body?: unknown;
  };
  return maybe.status === 400 && maybe.type === 'entity.parse.failed';
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const context = buildContext(req);

  if (isBodyParserSyntaxError(err)) {
    logError('warn', 'Malformed JSON payload', {
      ...context,
      errorName: err.name,
      errorMessage: err.message,
    });

    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload.',
    });
    return;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue?.message ?? 'Validation failed.';

    logError('warn', 'Validation error', {
      ...context,
      errorName: err.name,
      errorMessage: message,
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });

    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  if (err instanceof AppError) {
    logError('warn', 'Operational error', {
      ...context,
      errorName: err.name,
      errorMessage: err.message,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof Error) {
    logError('error', 'Unhandled application error', {
      ...context,
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    });
  } else {
    logError('error', 'Unknown throwable encountered', {
      ...context,
      error: String(err),
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
