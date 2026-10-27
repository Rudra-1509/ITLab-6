import { z } from 'zod';
import { RequestCategory, RequestStatus, WorkflowStage } from '@prisma/client';
import { paginationQuerySchema } from './common.schema';

export const createRequestSchema = z.object({
  category: z.nativeEnum(RequestCategory),
  title: z.string().trim().min(3, 'Title must be at least 3 characters long').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters long'),
  academicContext: z.record(z.string(), z.any()).default({}),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  targetReviewerId: z.string().uuid().optional(),
});

export const updateRequestSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  academicContext: z.record(z.string(), z.any()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  targetReviewerId: z.string().uuid().optional(),
});

export const resubmitRequestSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  academicContext: z.record(z.string(), z.any()).optional(),
  comments: z.string().trim().min(3, 'Explanation of changes is required for resubmission'),
});

export const requestQuerySchema = paginationQuerySchema.extend({
  category: z.nativeEnum(RequestCategory).optional(),
  status: z.nativeEnum(RequestStatus).optional(),
  stage: z.nativeEnum(WorkflowStage).optional(),
  requesterId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type ResubmitRequestInput = z.infer<typeof resubmitRequestSchema>;
export type RequestQueryInput = z.infer<typeof requestQuerySchema>;
