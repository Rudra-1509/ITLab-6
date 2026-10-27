import { request } from './client';
import { ProjectAllocation, AllocationStatus, PaginationMeta } from '../types';

export interface AllocationQueryParams {
  page?: number;
  limit?: number;
  proposalId?: string;
  studentId?: string;
  academicTerm?: string;
  status?: AllocationStatus;
}

export interface CreateAllocationPayload {
  proposalId: string;
  studentId: string;
  academicTerm: string;
}

export interface ReassignAllocationPayload {
  newProposalId: string;
  reason: string;
}

export interface CancelAllocationPayload {
  cancellationReason: string;
}

export const allocationsApi = {
  list: async (params?: AllocationQueryParams): Promise<{ items: ProjectAllocation[]; meta?: PaginationMeta }> => {
    const res = await request<ProjectAllocation[]>({
      url: '/allocations',
      method: 'GET',
      params,
    });
    return {
      items: res.data,
      meta: res.meta,
    };
  },

  create: async (payload: CreateAllocationPayload): Promise<ProjectAllocation> => {
    const res = await request<ProjectAllocation>({
      url: '/allocations',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  reassign: async (id: string, payload: ReassignAllocationPayload): Promise<ProjectAllocation> => {
    const res = await request<ProjectAllocation>({
      url: `/allocations/${id}`,
      method: 'PATCH',
      data: payload,
    });
    return res.data;
  },

  cancel: async (id: string, payload: CancelAllocationPayload): Promise<ProjectAllocation> => {
    const res = await request<ProjectAllocation>({
      url: `/allocations/${id}/cancel`,
      method: 'POST',
      data: payload,
    });
    return res.data;
  },
};
