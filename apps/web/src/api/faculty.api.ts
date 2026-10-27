import { request } from './client';
import { User, FacultyStatus, PaginationMeta } from '../types';

export interface FacultyQueryParams {
  page?: number;
  limit?: number;
  status?: FacultyStatus;
  departmentId?: string;
  search?: string;
}

export interface CreateFacultyPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  employeeId: string;
  designation: string;
  maxProjectCapacity?: number;
  specialization?: string;
}

export interface UpdateFacultyPayload {
  firstName?: string;
  lastName?: string;
  departmentId?: string;
  designation?: string;
  maxProjectCapacity?: number;
  specialization?: string;
  status?: FacultyStatus;
}

export const facultyApi = {
  list: async (params?: FacultyQueryParams): Promise<{ items: User[]; meta?: PaginationMeta }> => {
    const res = await request<User[]>({
      url: '/faculty',
      method: 'GET',
      params,
    });
    return {
      items: res.data,
      meta: res.meta,
    };
  },

  getById: async (id: string): Promise<User> => {
    const res = await request<User>({
      url: `/faculty/${id}`,
      method: 'GET',
    });
    return res.data;
  },

  create: async (payload: CreateFacultyPayload): Promise<User> => {
    const res = await request<User>({
      url: '/faculty',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  update: async (id: string, payload: UpdateFacultyPayload): Promise<User> => {
    const res = await request<User>({
      url: `/faculty/${id}`,
      method: 'PATCH',
      data: payload,
    });
    return res.data;
  },
};
