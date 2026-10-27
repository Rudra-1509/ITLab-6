import { Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { RequestWithUser } from '../types';
import { ProjectQueryInput } from '../schemas/project.schema';

export class ProjectController {
  async list(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectService.listProposals(req.query as unknown as ProjectQueryInput, req.user!);
      sendPaginated(res, result.proposals, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const proposal = await projectService.getProposalById(id, req.user!);
      sendSuccess(res, proposal);
    } catch (error) {
      next(error);
    }
  }

  async create(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await projectService.createProposal(req.body, req.user!);
      sendCreated(res, created);
    } catch (error) {
      next(error);
    }
  }

  async update(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await projectService.updateProposal(id, req.body, req.user!);
      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async publish(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const published = await projectService.publishProposal(id, req.user!);
      sendSuccess(res, published);
    } catch (error) {
      next(error);
    }
  }

  async archive(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const archived = await projectService.archiveProposal(id, req.user!);
      sendSuccess(res, archived);
    } catch (error) {
      next(error);
    }
  }

  async submitPreferences(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectService.submitPreferences(req.body, req.user!);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getMyPreferences(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const term = (req.query.academicTerm as string) || '';
      const preferences = await projectService.getStudentPreferences(req.user!.id, term, req.user!);
      sendSuccess(res, preferences);
    } catch (error) {
      next(error);
    }
  }

  async getApplications(req: RequestWithUser, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const applications = await projectService.getProposalApplications(id, req.user!);
      sendSuccess(res, applications);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
