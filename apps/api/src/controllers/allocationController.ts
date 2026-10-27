import { Response, NextFunction } from 'express';
import { allocationService } from '../services/allocationService';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { RequestWithUser } from '../types';
import { AllocationQueryInput } from '../schemas/allocation.schema';

export class AllocationController {
  async list(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await allocationService.listAllocations(req.query as unknown as AllocationQueryInput, req.user!);
      sendPaginated(res, result.allocations, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async create(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const allocation = await allocationService.createAllocation(req.body, req.user!);
      sendCreated(res, allocation);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const cancelled = await allocationService.cancelAllocation(id, req.body, req.user!);
      sendSuccess(res, cancelled);
    } catch (error) {
      next(error);
    }
  }

  async reassign(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const reassigned = await allocationService.reassignAllocation(id, req.body, req.user!);
      sendSuccess(res, reassigned);
    } catch (error) {
      next(error);
    }
  }
}

export const allocationController = new AllocationController();
