import { z } from 'zod';
import { ProposalEligibility, ProposalStatus } from '@prisma/client';
import { paginationQuerySchema } from './common.schema';

export const createProposalSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters long').max(200),
  description: z.string().trim().min(20, 'Description must be at least 20 characters long'),
  academicTerm: z.string().trim().min(3, 'Academic term is required (e.g. 2024-AUTUMN)'),
  ugPgEligibility: z.nativeEnum(ProposalEligibility).default(ProposalEligibility.BOTH),
  capacity: z.coerce.number().int().min(1).max(20).default(2),
  prerequisites: z.string().trim().optional(),
  applicationDeadline: z.coerce.date().optional(),
});

export const updateProposalSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.string().trim().min(20).optional(),
  academicTerm: z.string().trim().min(3).optional(),
  ugPgEligibility: z.nativeEnum(ProposalEligibility).optional(),
  capacity: z.coerce.number().int().min(1).max(20).optional(),
  prerequisites: z.string().trim().optional(),
  applicationDeadline: z.coerce.date().optional(),
});

export const submitPreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        proposalId: z.string().uuid('Invalid proposal ID'),
        rank: z.coerce.number().int().min(1).max(10),
      })
    )
    .min(1, 'At least one preference must be submitted')
    .refine(
      (items) => {
        const ranks = items.map((i) => i.rank);
        return new Set(ranks).size === ranks.length;
      },
      { message: 'Ranks must be distinct with no duplicates' }
    )
    .refine(
      (items) => {
        const proposals = items.map((i) => i.proposalId);
        return new Set(proposals).size === proposals.length;
      },
      { message: 'Proposals must be distinct with no duplicates' }
    ),
  academicTerm: z.string().trim().min(3, 'Academic term is required'),
});

export const projectQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ProposalStatus).optional(),
  academicTerm: z.string().trim().optional(),
  ugPgEligibility: z.nativeEnum(ProposalEligibility).optional(),
  supervisorId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type SubmitPreferencesInput = z.infer<typeof submitPreferencesSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
