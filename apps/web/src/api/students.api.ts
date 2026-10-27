import { request } from './client';
import { User, StudentProgram, StudentStatus, PaginationMeta } from '../types';

export interface StudentQueryParams {
  page?: number;
  limit?: number;
  program?: StudentProgram;
  batchYear?: number;
  currentSemester?: number;
  status?: StudentStatus;
  departmentId?: string;
  search?: string;
}

export interface CreateStudentPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  rollNumber: string;
  program: StudentProgram;
  batchYear: number;
  currentSemester: number;
  cgpa?: number;
}

export interface UpdateStudentPayload {
  firstName?: string;
  lastName?: string;
  departmentId?: string;
  currentSemester?: number;
  cgpa?: number;
  status?: StudentStatus;
}

export const studentsApi = {
  list: async (params?: StudentQueryParams): Promise<{ items: User[]; meta?: PaginationMeta }> => {
    const res = await request<User[]>({
      url: '/students',
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
      url: `/students/${id}`,
      method: 'GET',
    });
    return res.data;
  },

  create: async (payload: CreateStudentPayload): Promise<User> => {
    const res = await request<User>({
      url: '/students',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  update: async (id: string, payload: UpdateStudentPayload): Promise<User> => {
    const res = await request<User>({
      url: `/students/${id}`,
      method: 'PATCH',
      data: payload,
    });
    return res.data;
  },
};
