import { Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';
import { sendSuccess } from '../utils/response';
import { RequestWithUser } from '../types';

export class ReportController {
  async getRequestReport(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const departmentId = req.query.departmentId as string | undefined;
      const report = await reportService.getRequestReport(req.user!, departmentId);
      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }

  async getAllocationReport(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const term = req.query.academicTerm as string | undefined;
      const report = await reportService.getAllocationReport(req.user!, term);
      sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
