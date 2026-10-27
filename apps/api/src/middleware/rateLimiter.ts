import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter for authentication/sensitive routes
 * Window: default 15 minutes, Max requests: default 10 per IP
 */
export function rateLimiter(options: { windowMs?: number; maxRequests?: number } = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const maxRequests = options.maxRequests || 20;

  return (req: Request, _res: Response, next: NextFunction): void => {
    // In test environment, skip rate limiting to avoid test interference
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      return next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          `Too many requests from this IP. Please try again after ${retryAfterSeconds} seconds.`,
          { retryAfterSeconds }
        )
      );
    }

    next();
  };
}
