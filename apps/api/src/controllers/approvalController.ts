import { Response, NextFunction } from 'express';
import { workflowEngine } from '../services/workflowEngine';
import { requestService } from '../services/requestService';
import { sendSuccess } from '../utils/response';
import { RequestWithUser } from '../types';

export class ApprovalController {
  async getPending(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const pending = await requestService.getPendingApprovals(req.user!);
      sendSuccess(res, pending);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const approved = await workflowEngine.approveStage({
        requestId: id,
        actor: req.user!,
        comments: req.body?.comments,
      });
      sendSuccess(res, approved);
    } catch (error) {
      next(error);
    }
  }

  async reject(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const rejected = await workflowEngine.rejectRequest({
        requestId: id,
        actor: req.user!,
        rejectionReason: req.body.rejectionReason,
        comments: req.body.comments,
      });
      sendSuccess(res, rejected);
    } catch (error) {
      next(error);
    }
  }

  async requestChanges(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await workflowEngine.requestChanges({
        requestId: id,
        actor: req.user!,
        comments: req.body.comments,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const approvalController = new ApprovalController();
