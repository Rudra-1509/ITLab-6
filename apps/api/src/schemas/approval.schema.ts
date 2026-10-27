import { z } from 'zod';

export const approveStageSchema = z.object({
  comments: z.string().trim().max(1000).optional(),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, 'Rejection reason is required and must be at least 5 characters long')
    .max(1000),
  comments: z.string().trim().max(1000).optional(),
});

export const requestChangesSchema = z.object({
  comments: z
    .string()
    .trim()
    .min(5, 'Specific requested changes must be explained and be at least 5 characters long')
    .max(1000),
});

export type ApproveStageInput = z.infer<typeof approveStageSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
export type RequestChangesInput = z.infer<typeof requestChangesSchema>;
