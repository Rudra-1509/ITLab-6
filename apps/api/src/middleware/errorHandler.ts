import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response {
  // Operational AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[AppError ${err.statusCode}] ${err.code}: ${err.message}`, {
        path: req.originalUrl,
        method: req.method,
        details: err.details,
        stack: err.stack,
      });
    } else {
      logger.warn(`[AppError ${err.statusCode}] ${err.code}: ${err.message}`, {
        path: req.originalUrl,
        method: req.method,
        details: err.details,
      });
    }
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle Prisma Database Errors centrally
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(`[PrismaKnownError ${err.code}] ${err.message}`, {
      meta: err.meta,
      path: req.originalUrl,
    });

    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || ['resource'];
        return sendError(
          res,
          409,
          'CONFLICT',
          `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists.`,
          { fields: target }
        );
      }
      case 'P2025':
        return sendError(res, 404, 'NOT_FOUND', 'Requested resource was not found in the database.');
      case 'P2003':
        return sendError(res, 400, 'FOREIGN_KEY_VIOLATION', 'Invalid reference provided to a related resource.', {
          field: err.meta?.field_name,
        });
      default:
        return sendError(res, 400, 'DATABASE_ERROR', 'A database constraint error occurred.');
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn(`[PrismaValidationError] ${err.message}`);
    return sendError(res, 400, 'DATABASE_VALIDATION_ERROR', 'Database query validation error.');
  }

  // JSON Body Parse Error
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    return sendError(res, 400, 'MALFORMED_JSON', 'Malformed JSON payload received in request body.');
  }

  // Unexpected Internal Server Error
  logger.error(`[UnhandledServerError] ${err.message}`, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message
  );
}
