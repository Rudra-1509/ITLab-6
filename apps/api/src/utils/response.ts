import { Response } from 'express';
import { ApiResponse, ApiErrorResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, meta?: Record<string, unknown>, statusCode = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
  return sendSuccess(res, data, meta, 201);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  additionalMeta?: Record<string, unknown>
): Response {
  const totalPages = Math.ceil(total / limit) || 1;
  const meta = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    ...additionalMeta,
  };
  return sendSuccess(res, data, meta, 200);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return res.status(statusCode).json(body);
}
