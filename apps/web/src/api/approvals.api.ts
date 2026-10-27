import { request } from './client';
import { DepartmentalRequest } from '../types';

export const approvalsApi = {
  getPending: async (): Promise<DepartmentalRequest[]> => {
    const res = await request<DepartmentalRequest[]>({
      url: '/approvals/pending',
      method: 'GET',
    });
    return res.data;
  },
};
