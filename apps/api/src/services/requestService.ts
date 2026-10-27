import { prisma, Prisma, Role, RequestStatus } from '@dms/database';
import { CreateRequestInput, UpdateRequestInput, RequestQueryInput, ResubmitRequestInput } from '../schemas/request.schema';
import { AuthenticatedUser } from '../types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { workflowEngine } from './workflowEngine';
import { auditService } from './auditService';

export class RequestService {
  async createRequest(input: CreateRequestInput, currentUser: AuthenticatedUser) {
    if (!currentUser.departmentId) {
      throw new BadRequestError('User must belong to a department to initiate requests.');
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.departmentalRequest.create({
        data: {
          requesterId: currentUser.id,
          departmentId: currentUser.departmentId!,
          category: input.category,
          title: input.title,
          description: input.description,
          academicContext: input.academicContext as Prisma.InputJsonValue,
          priority: input.priority,
          targetReviewerId: input.targetReviewerId || null,
          currentStatus: RequestStatus.DRAFT,
        },
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          department: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'REQUEST_DRAFT_CREATED',
          entityType: 'DepartmentalRequest',
          entityId: created.id,
          afterState: { category: input.category, title: input.title },
        },
        tx
      );

      return created;
    });

    return request;
  }

  async listRequests(query: RequestQueryInput, currentUser: AuthenticatedUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentalRequestWhereInput = {};

    // IDOR / Visibility scoping:
    // Students can only see their own requests
    if (currentUser.role === Role.STUDENT) {
      where.requesterId = currentUser.id;
    } else if (currentUser.role === Role.FACULTY) {
      // Faculty see requests where they are requester, or assigned reviewer, or in their department if under review
      where.OR = [
        { requesterId: currentUser.id },
        { targetReviewerId: currentUser.id },
        {
          departmentId: currentUser.departmentId || undefined,
          currentStatus: { in: [RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW] },
        },
      ];
    } else if (currentUser.role === Role.HOD) {
      // HOD sees department-wide requests
      if (currentUser.departmentId) {
        where.departmentId = currentUser.departmentId;
      }
    }
    // Department admin can filter by department or see all if unconstrained

    if (query.category) where.category = query.category;
    if (query.status) where.currentStatus = query.status;
    if (query.stage) where.currentStage = query.stage;
    if (query.requesterId) where.requesterId = query.requesterId;
    if (query.departmentId) where.departmentId = query.departmentId;

    if (query.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { requester: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { requester: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.departmentalRequest.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          targetReviewer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          department: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      prisma.departmentalRequest.count({ where }),
    ]);

    return { requests, total, page, limit };
  }

  async getRequestById(id: string, currentUser: AuthenticatedUser) {
    const request = await prisma.departmentalRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            studentProfile: true,
          },
        },
        targetReviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        department: true,
        workflowHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundError('Departmental request not found.');
    }

    // Object-level permission check:
    if (currentUser.role === Role.STUDENT && request.requesterId !== currentUser.id) {
      throw new ForbiddenError('Access denied. You can only view your own requests.');
    }

    if (
      currentUser.role === Role.FACULTY &&
      request.requesterId !== currentUser.id &&
      request.targetReviewerId !== currentUser.id &&
      request.departmentId !== currentUser.departmentId
    ) {
      throw new ForbiddenError('Access denied. You do not have permission to view this request.');
    }

    return request;
  }

  async updateRequest(id: string, input: UpdateRequestInput, currentUser: AuthenticatedUser) {
    const request = await prisma.departmentalRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundError('Request not found.');
    }

    // Only owner or admin can edit
    if (request.requesterId !== currentUser.id && currentUser.role !== Role.DEPARTMENT_ADMIN) {
      throw new ForbiddenError('You can only edit your own requests.');
    }

    // Can only edit if in DRAFT or CHANGES_REQUESTED
    if (request.currentStatus !== RequestStatus.DRAFT && request.currentStatus !== RequestStatus.CHANGES_REQUESTED) {
      throw new BadRequestError(
        `Cannot edit request with status '${request.currentStatus}'. Only drafts or requests with revisions requested can be edited.`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.departmentalRequest.update({
        where: { id },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.description ? { description: input.description } : {}),
          ...(input.academicContext ? { academicContext: input.academicContext as Prisma.InputJsonValue } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.targetReviewerId ? { targetReviewerId: input.targetReviewerId } : {}),
        },
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          department: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'REQUEST_UPDATED',
          entityType: 'DepartmentalRequest',
          entityId: id,
          afterState: input as Record<string, unknown>,
        },
        tx
      );

      return res;
    });

    return updated;
  }

  async submitRequest(id: string, currentUser: AuthenticatedUser) {
    return workflowEngine.submitRequest(id, currentUser);
  }

  async cancelRequest(id: string, currentUser: AuthenticatedUser, reason?: string) {
    return workflowEngine.cancelRequest(id, currentUser, reason);
  }

  async resubmitRequest(id: string, input: ResubmitRequestInput, currentUser: AuthenticatedUser) {
    return workflowEngine.resubmitRequest({
      requestId: id,
      actor: currentUser,
      comments: input.comments,
      updatedData: {
        title: input.title,
        description: input.description,
        academicContext: input.academicContext,
      },
    });
  }

  async getRequestHistory(id: string, currentUser: AuthenticatedUser) {
    // Check permission via getRequestById check
    await this.getRequestById(id, currentUser);

    return prisma.requestWorkflowHistory.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });
  }

  async getPendingApprovals(currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.STUDENT) {
      throw new ForbiddenError('Students do not have pending approvals.');
    }

    const where: Prisma.DepartmentalRequestWhereInput = {
      currentStatus: RequestStatus.UNDER_REVIEW,
    };

    if (currentUser.role === Role.FACULTY) {
      // Pending faculty review: where targetReviewer is current user OR unassigned in same department
      where.currentStage = 'FACULTY_REVIEW';
      where.OR = [
        { targetReviewerId: currentUser.id },
        { targetReviewerId: null, departmentId: currentUser.departmentId || undefined },
      ];
    } else if (currentUser.role === Role.HOD) {
      // HOD sees requests at HOD_REVIEW or FINAL_DECISION in department
      where.currentStage = { in: ['HOD_REVIEW', 'FINAL_DECISION'] };
      if (currentUser.departmentId) {
        where.departmentId = currentUser.departmentId;
      }
    } else if (currentUser.role === Role.DEPARTMENT_ADMIN) {
      // Admin can see all pending under review
      if (currentUser.departmentId) {
        where.departmentId = currentUser.departmentId;
      }
    }

    return prisma.departmentalRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        requester: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, studentProfile: true },
        },
        department: true,
      },
    });
  }
}

export const requestService = new RequestService();
