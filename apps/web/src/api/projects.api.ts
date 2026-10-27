import { request } from './client';
import {
  ProjectProposal,
  ProjectPreference,
  ProposalEligibility,
  ProposalStatus,
  PaginationMeta,
} from '../types';

export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  academicTerm?: string;
  ugPgEligibility?: ProposalEligibility;
  supervisorId?: string;
  departmentId?: string;
}

export interface CreateProposalPayload {
  title: string;
  description: string;
  academicTerm: string;
  ugPgEligibility?: ProposalEligibility;
  capacity?: number;
  prerequisites?: string;
  applicationDeadline?: string;
}

export interface UpdateProposalPayload {
  title?: string;
  description?: string;
  academicTerm?: string;
  ugPgEligibility?: ProposalEligibility;
  capacity?: number;
  prerequisites?: string;
  applicationDeadline?: string;
}

export interface PreferenceItem {
  proposalId: string;
  rank: number;
}

export interface SubmitPreferencesPayload {
  preferences: PreferenceItem[];
  academicTerm: string;
}

export const projectsApi = {
  list: async (params?: ProjectQueryParams): Promise<{ items: ProjectProposal[]; meta?: PaginationMeta }> => {
    const res = await request<ProjectProposal[]>({
      url: '/projects',
      method: 'GET',
      params,
    });
    return {
      items: res.data,
      meta: res.meta,
    };
  },

  getById: async (id: string): Promise<ProjectProposal> => {
    const res = await request<ProjectProposal>({
      url: `/projects/${id}`,
      method: 'GET',
    });
    return res.data;
  },

  create: async (payload: CreateProposalPayload): Promise<ProjectProposal> => {
    const res = await request<ProjectProposal>({
      url: '/projects',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  update: async (id: string, payload: UpdateProposalPayload): Promise<ProjectProposal> => {
    const res = await request<ProjectProposal>({
      url: `/projects/${id}`,
      method: 'PATCH',
      data: payload,
    });
    return res.data;
  },

  publish: async (id: string): Promise<ProjectProposal> => {
    const res = await request<ProjectProposal>({
      url: `/projects/${id}/publish`,
      method: 'POST',
    });
    return res.data;
  },

  archive: async (id: string): Promise<ProjectProposal> => {
    const res = await request<ProjectProposal>({
      url: `/projects/${id}/archive`,
      method: 'POST',
    });
    return res.data;
  },

  getApplications: async (id: string): Promise<ProjectPreference[]> => {
    const res = await request<ProjectPreference[]>({
      url: `/projects/${id}/applications`,
      method: 'GET',
    });
    return res.data;
  },

  getMyPreferences: async (): Promise<ProjectPreference[]> => {
    const res = await request<ProjectPreference[]>({
      url: '/projects/preferences/me',
      method: 'GET',
    });
    return res.data;
  },

  submitPreferences: async (payload: SubmitPreferencesPayload): Promise<ProjectPreference[]> => {
    const res = await request<ProjectPreference[]>({
      url: '/projects/preferences',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },
};
