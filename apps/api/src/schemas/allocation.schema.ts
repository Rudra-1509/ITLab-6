import { z } from 'zod';
import { AllocationStatus } from '@prisma/client';
import { paginationQuerySchema } from './common.schema';

export const createAllocationSchema = z.object({
  proposalId: z.string().uuid('Invalid proposal ID'),
  studentId: z.string().uuid('Invalid student user ID'),
  academicTerm: z.string().trim().min(3, 'Academic term is required'),
});

export const cancelAllocationSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(5, 'Cancellation reason must be provided (minimum 5 characters)')
    .max(500),
});

export const reassignAllocationSchema = z.object({
  newProposalId: z.string().uuid('Invalid target proposal ID'),
  reason: z.string().trim().min(5, 'Reassignment reason must be provided').max(500),
});

export const allocationQuerySchema = paginationQuerySchema.extend({
  proposalId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  academicTerm: z.string().trim().optional(),
  status: z.nativeEnum(AllocationStatus).optional(),
});

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type CancelAllocationInput = z.infer<typeof cancelAllocationSchema>;
export type ReassignAllocationInput = z.infer<typeof reassignAllocationSchema>;
export type AllocationQueryInput = z.infer<typeof allocationQuerySchema>;
