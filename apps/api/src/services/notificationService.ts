import { prisma, NotificationType } from '@dms/database';
import { logger } from '../utils/logger';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
}

export class NotificationService {
  /**
   * Persist a notification. Non-blocking to guarantee safety of business actions.
   */
  async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          linkUrl: params.linkUrl || null,
        },
      });
    } catch (error) {
      logger.error('Failed to persist notification:', { error, params });
    }
  }

  /**
   * Batch create notifications (e.g. for multiple reviewers or department members)
   */
  async notifyMany(notifications: CreateNotificationParams[]): Promise<void> {
    try {
      if (notifications.length === 0) return;
      await prisma.notification.createMany({
        data: notifications.map((n) => ({
          userId: n.userId,
          title: n.title,
          message: n.message,
          type: n.type,
          linkUrl: n.linkUrl || null,
        })),
      });
    } catch (error) {
      logger.error('Failed to batch persist notifications:', { error });
    }
  }

  async listForUser(userId: string, options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(options.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export const notificationService = new NotificationService();
