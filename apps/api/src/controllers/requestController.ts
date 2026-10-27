import { Response, NextFunction } from 'express';
import { requestService } from '../services/requestService';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { RequestWithUser } from '../types';
import { RequestQueryInput } from '../schemas/request.schema';

export class RequestController {
  async list(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.listRequests(req.query as unknown as RequestQueryInput, req.user!);
      sendPaginated(res, result.requests, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const request = await requestService.getRequestById(id, req.user!);
      sendSuccess(res, request);
    } catch (error) {
      next(error);
    }
  }

  async create(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await requestService.createRequest(req.body, req.user!);
      sendCreated(res, created);
    } catch (error) {
      next(error);
    }
  }

  async update(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await requestService.updateRequest(id, req.body, req.user!);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async submit(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const submitted = await requestService.submitRequest(id, req.user!);
      sendSuccess(res, submitted);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const cancelled = await requestService.cancelRequest(id, req.user!, req.body?.reason);
      sendSuccess(res, cancelled);
    } catch (error) {
      next(error);
    }
  }

  async resubmit(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const resubmitted = await requestService.resubmitRequest(id, req.body, req.user!);
      sendSuccess(res, resubmitted);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const history = await requestService.getRequestHistory(id, req.user!);
      sendSuccess(res, history);
    } catch (error) {
      next(error);
    }
  }
}

export const requestController = new RequestController();
