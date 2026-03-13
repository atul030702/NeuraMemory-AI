import rateLimit from 'express-rate-limit';

function keyGenerator(ip: string | undefined): string {
  return ip?.trim() || 'unknown-client';
}

function rateLimitResponse(message: string) {
  return {
    success: false,
    message,
  };
}

/**
 * Environment-aware limits:
 * - In development/test, keep limits very high to avoid interfering with local test suites.
 * - In production, enforce strict limits.
 */
const nodeEnv = process.env['NODE_ENV'];
const isDevelopmentLike = nodeEnv === 'development' || nodeEnv === 'test';

const loginMaxRequests = isDevelopmentLike ? 10_000 : 5;
const registerMaxRequests = isDevelopmentLike ? 10_000 : 10;

const loginWindowMs = 15 * 60 * 1000; // 15 minutes
const registerWindowMs = 60 * 60 * 1000; // 1 hour

export const loginRateLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: loginMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => keyGenerator(req.ip),
  message: rateLimitResponse(
    isDevelopmentLike
      ? 'Rate limit exceeded in development mode (unexpected).'
      : 'Too many login attempts. Please try again in 15 minutes.',
  ),
  skipSuccessfulRequests: false,
});

export const registerRateLimiter = rateLimit({
  windowMs: registerWindowMs,
  max: registerMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => keyGenerator(req.ip),
  message: rateLimitResponse(
    isDevelopmentLike
      ? 'Rate limit exceeded in development mode (unexpected).'
      : 'Too many registration attempts. Please try again in 1 hour.',
  ),
  skipSuccessfulRequests: false,
});
