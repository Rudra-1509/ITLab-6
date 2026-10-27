import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { sendSuccess, sendPaginated } from '../utils/response';
import { RequestWithUser } from '../types';
import { NotFoundError } from '../utils/errors';

export class NotificationController {
  async list(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.listForUser(req.user!.id, {
        page,
        limit,
        unreadOnly,
      });

      sendPaginated(res, result.notifications, result.page, result.limit, result.total, {
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await notificationService.markAsRead(id, req.user!.id);
      if (!updated) {
        throw new NotFoundError('Notification not found.');
      }
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      sendSuccess(res, { message: 'All notifications marked as read.', updatedCount: result.count });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
