import { z } from 'zod';
import { PAGINATION } from '../config/constants';

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid identifier format. Must be a valid UUID.'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
