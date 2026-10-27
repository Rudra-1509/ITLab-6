import { request } from './client';
import {
  DepartmentalRequest,
  RequestCategory,
  RequestStatus,
  WorkflowStage,
  RequestWorkflowHistory,
  PaginationMeta,
} from '../types';

export interface RequestQueryParams {
  page?: number;
  limit?: number;
  category?: RequestCategory;
  status?: RequestStatus;
  stage?: WorkflowStage;
  requesterId?: string;
  departmentId?: string;
  search?: string;
}

export interface CreateRequestPayload {
  category: RequestCategory;
  title: string;
  description: string;
  academicContext?: Record<string, unknown>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetReviewerId?: string;
}

export interface UpdateRequestPayload {
  title?: string;
  description?: string;
  academicContext?: Record<string, unknown>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetReviewerId?: string;
}

export interface ResubmitRequestPayload {
  title?: string;
  description?: string;
  academicContext?: Record<string, unknown>;
  comments: string;
}

export interface ApproveStagePayload {
  comments?: string;
}

export interface RejectRequestPayload {
  rejectionReason: string;
  comments?: string;
}

export interface RequestChangesPayload {
  comments: string;
}

export const requestsApi = {
  list: async (params?: RequestQueryParams): Promise<{ items: DepartmentalRequest[]; meta?: PaginationMeta }> => {
    const res = await request<DepartmentalRequest[]>({
      url: '/requests',
      method: 'GET',
      params,
    });
    return {
      items: res.data,
      meta: res.meta,
    };
  },

  getById: async (id: string): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}`,
      method: 'GET',
    });
    return res.data;
  },

  create: async (payload: CreateRequestPayload): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: '/requests',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  update: async (id: string, payload: UpdateRequestPayload): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}`,
      method: 'PATCH',
      data: payload,
    });
    return res.data;
  },

  getHistory: async (id: string): Promise<RequestWorkflowHistory[]> => {
    const res = await request<RequestWorkflowHistory[]>({
      url: `/requests/${id}/history`,
      method: 'GET',
    });
    return res.data;
  },

  submit: async (id: string): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}/submit`,
      method: 'POST',
    });
    return res.data;
  },

  cancel: async (id: string): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}/cancel`,
      method: 'POST',
    });
    return res.data;
  },

  resubmit: async (id: string, payload: ResubmitRequestPayload): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}/resubmit`,
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  approve: async (id: string, payload?: ApproveStagePayload): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}/approve`,
      method: 'POST',
      data: payload || {},
    });
    return res.data;
  },

  reject: async (id: string, payload: RejectRequestPayload): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}/reject`,
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  requestChanges: async (id: string, payload: RequestChangesPayload): Promise<DepartmentalRequest> => {
    const res = await request<DepartmentalRequest>({
      url: `/requests/${id}/request-changes`,
      method: 'POST',
      data: payload,
    });
    return res.data;
  },
};
