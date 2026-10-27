import { Response, NextFunction } from 'express';
import { studentService } from '../services/studentService';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { RequestWithUser } from '../types';
import { StudentQueryInput } from '../schemas/student.schema';

export class StudentController {
  async list(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.listStudents(req.query as unknown as StudentQueryInput, req.user!);
      sendPaginated(res, result.students, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const student = await studentService.getStudentById(id, req.user!);
      sendSuccess(res, student);
    } catch (error) {
      next(error);
    }
  }

  async create(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await studentService.createStudent(req.body, req.user!);
      sendCreated(res, created);
    } catch (error) {
      next(error);
    }
  }

  async update(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await studentService.updateStudent(id, req.body, req.user!);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();
