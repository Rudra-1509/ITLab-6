import { request } from './client';
import { RequestReportData, AllocationReportData } from '../types';

export const reportsApi = {
  getRequestReport: async (): Promise<RequestReportData> => {
    const res = await request<RequestReportData>({
      url: '/reports/requests',
      method: 'GET',
    });
    return res.data;
  },

  getAllocationReport: async (): Promise<AllocationReportData> => {
    const res = await request<AllocationReportData>({
      url: '/reports/allocations',
      method: 'GET',
    });
    return res.data;
  },
};
