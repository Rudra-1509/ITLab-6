import { Response, NextFunction } from 'express';
import { facultyService } from '../services/facultyService';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { RequestWithUser } from '../types';
import { FacultyQueryInput } from '../schemas/faculty.schema';

export class FacultyController {
  async list(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await facultyService.listFaculty(req.query as unknown as FacultyQueryInput, req.user!);
      sendPaginated(res, result.faculty, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const faculty = await facultyService.getFacultyById(id, req.user!);
      sendSuccess(res, faculty);
    } catch (error) {
      next(error);
    }
  }

  async create(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await facultyService.createFaculty(req.body, req.user!);
      sendCreated(res, created);
    } catch (error) {
      next(error);
    }
  }

  async update(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await facultyService.updateFaculty(id, req.body, req.user!);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }
}

export const facultyController = new FacultyController();
