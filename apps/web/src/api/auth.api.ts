import { apiClient, request } from './client';
import { User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponseData {
  token: string;
  user: User;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponseData> => {
    const res = await request<LoginResponseData>({
      url: '/auth/login',
      method: 'POST',
      data: payload,
    });
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const res = await request<User>({
      url: '/auth/me',
      method: 'GET',
    });
    return res.data;
  },
};
