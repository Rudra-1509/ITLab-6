import { request } from './client';
import { Notification } from '../types';

export const notificationsApi = {
  list: async (): Promise<Notification[]> => {
    const res = await request<Notification[]>({
      url: '/notifications',
      method: 'GET',
    });
    return res.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const res = await request<Notification>({
      url: `/notifications/${id}/read`,
      method: 'PATCH',
    });
    return res.data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const res = await request<{ count: number }>({
      url: '/notifications/read-all',
      method: 'PATCH',
    });
    return res.data;
  },
};
