import {
  prisma,
  Prisma,
  RequestStatus,
  WorkflowStage,
  WorkflowAction,
  Role,
  NotificationType,
  DepartmentalRequest,
} from '@dms/database';
import { WORKFLOW_CONFIG, STAGE_ROLE_MAPPING } from '../config/constants';
import { AuthenticatedUser } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export interface WorkflowTransitionParams {
  requestId: string;
  actor: AuthenticatedUser;
  action: WorkflowAction;
  comments?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

export class WorkflowEngine {
  /**
   * Determine the ordered stages for a request based on category
   */
  getStagesForCategory(category: DepartmentalRequest['category']): WorkflowStage[] {
    const config = WORKFLOW_CONFIG[category];
    return config?.stages || [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW];
  }

  /**
   * Check whether an actor has the required role and authority to act on a workflow stage
   */
  validateActorAuthority(actor: AuthenticatedUser, stage: WorkflowStage, targetReviewerId?: string | null): void {
    const allowedRoles = STAGE_ROLE_MAPPING[stage];
    if (!allowedRoles || !allowedRoles.includes(actor.role)) {
      throw new ForbiddenError(
        `Access denied. Role '${actor.role}' is not authorized to review or approve stage '${stage}'.`
      );
    }

    // If an explicit target reviewer was assigned at FACULTY_REVIEW, check if other faculty can review
    if (stage === WorkflowStage.FACULTY_REVIEW && targetReviewerId) {
      if (actor.role === Role.FACULTY && actor.id !== targetReviewerId) {
        throw new ForbiddenError(
          'This request is assigned to a specific faculty reviewer. Only the assigned reviewer, HOD, or Admin can act on it.'
        );
      }
    }
  }

  /**
   * Submit a DRAFT request into the workflow
   */
  async submitRequest(requestId: string, actor: AuthenticatedUser): Promise<DepartmentalRequest> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.departmentalRequest.findUnique({
        where: { id: requestId },
        include: { requester: true },
      });

      if (!request) {
        throw new NotFoundError('Request not found.');
      }

      // Check ownership
      if (request.requesterId !== actor.id && actor.role !== Role.DEPARTMENT_ADMIN) {
        throw new ForbiddenError('You can only submit your own requests.');
      }

      if (request.currentStatus !== RequestStatus.DRAFT) {
        throw new BadRequestError(
          `Only requests in 'DRAFT' status can be submitted. Current status: '${request.currentStatus}'.`
        );
      }

      const stages = this.getStagesForCategory(request.category);
      const initialStage = stages[0];

      const updated = await tx.departmentalRequest.update({
        where: { id: requestId },
        data: {
          currentStatus: RequestStatus.UNDER_REVIEW,
          currentStage: initialStage,
        },
      });

      // Record in workflow history
      await tx.requestWorkflowHistory.create({
        data: {
          requestId,
          actorId: actor.id,
          action: WorkflowAction.SUBMIT,
          stage: initialStage,
          previousStatus: RequestStatus.DRAFT,
          resultingStatus: RequestStatus.UNDER_REVIEW,
          comments: 'Request submitted for review.',
        },
      });

      // Audit log
      await auditService.log(
        {
          actorId: actor.id,
          action: 'REQUEST_SUBMITTED',
          entityType: 'DepartmentalRequest',
          entityId: requestId,
          beforeState: { currentStatus: RequestStatus.DRAFT },
          afterState: { currentStatus: RequestStatus.UNDER_REVIEW, currentStage: initialStage },
        },
        tx
      );

      // Async notification to requester and potential reviewers
      setImmediate(async () => {
        await notificationService.createNotification({
          userId: request.requesterId,
          title: 'Request Submitted',
          message: `Your request "${request.title}" was successfully submitted and is under ${initialStage}.`,
          type: NotificationType.REQUEST_SUBMITTED,
          linkUrl: `/requests/${requestId}`,
        });

        if (request.targetReviewerId) {
          await notificationService.createNotification({
            userId: request.targetReviewerId,
            title: 'Approval Pending',
            message: `A new request "${request.title}" is awaiting your review.`,
            type: NotificationType.APPROVAL_PENDING,
            linkUrl: `/requests/${requestId}`,
          });
        }
      });

      return updated;
    });
  }

  /**
   * Approve current stage in the workflow
   */
  async approveStage(params: {
    requestId: string;
    actor: AuthenticatedUser;
    comments?: string;
  }): Promise<DepartmentalRequest> {
    const { requestId, actor, comments } = params;

    return prisma.$transaction(async (tx) => {
      // Fetch request with lock-equivalent check
      const request = await tx.departmentalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundError('Request not found.');
      }

      if (request.currentStatus !== RequestStatus.UNDER_REVIEW || !request.currentStage) {
        throw new ConflictError(
          `Cannot approve request. Request must be in 'UNDER_REVIEW' status. Current status: '${request.currentStatus}'.`
        );
      }

      const currentStage = request.currentStage;
      this.validateActorAuthority(actor, currentStage, request.targetReviewerId);

      const stages = this.getStagesForCategory(request.category);
      const currentStageIndex = stages.indexOf(currentStage);

      if (currentStageIndex === -1) {
        throw new BadRequestError(`Current stage '${currentStage}' is not valid for category '${request.category}'.`);
      }

      const isLastStage = currentStageIndex === stages.length - 1;
      const nextStage = isLastStage ? null : stages[currentStageIndex + 1];
      const newStatus = isLastStage ? RequestStatus.APPROVED : RequestStatus.UNDER_REVIEW;

      const updated = await tx.departmentalRequest.update({
        where: { id: requestId },
        data: {
          currentStatus: newStatus,
          currentStage: nextStage,
        },
      });

      await tx.requestWorkflowHistory.create({
        data: {
          requestId,
          actorId: actor.id,
          action: WorkflowAction.APPROVE_STAGE,
          stage: currentStage,
          previousStatus: RequestStatus.UNDER_REVIEW,
          resultingStatus: newStatus,
          comments: comments || (isLastStage ? 'Final approval granted.' : `Approved stage: ${currentStage}.`),
        },
      });

      await auditService.log(
        {
          actorId: actor.id,
          action: isLastStage ? 'REQUEST_FINAL_APPROVED' : 'REQUEST_STAGE_APPROVED',
          entityType: 'DepartmentalRequest',
          entityId: requestId,
          beforeState: { currentStatus: request.currentStatus, currentStage },
          afterState: { currentStatus: newStatus, currentStage: nextStage },
        },
        tx
      );

      // Trigger notifications
      setImmediate(async () => {
        if (isLastStage) {
          await notificationService.createNotification({
            userId: request.requesterId,
            title: 'Request Approved',
            message: `Your request "${request.title}" has received final approval!`,
            type: NotificationType.REQUEST_APPROVED,
            linkUrl: `/requests/${requestId}`,
          });
        } else if (nextStage) {
          await notificationService.createNotification({
            userId: request.requesterId,
            title: 'Stage Approved',
            message: `Your request "${request.title}" was approved at ${currentStage} and advanced to ${nextStage}.`,
            type: NotificationType.APPROVAL_PENDING,
            linkUrl: `/requests/${requestId}`,
          });
        }
      });

      return updated;
    });
  }

  /**
   * Reject a request at the current stage
   */
  async rejectRequest(params: {
    requestId: string;
    actor: AuthenticatedUser;
    rejectionReason: string;
    comments?: string;
  }): Promise<DepartmentalRequest> {
    const { requestId, actor, rejectionReason, comments } = params;

    return prisma.$transaction(async (tx) => {
      const request = await tx.departmentalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundError('Request not found.');
      }

      if (request.currentStatus !== RequestStatus.UNDER_REVIEW || !request.currentStage) {
        throw new ConflictError(
          `Cannot reject request. It is not currently under review. Status: '${request.currentStatus}'.`
        );
      }

      this.validateActorAuthority(actor, request.currentStage, request.targetReviewerId);

      const previousStatus = request.currentStatus;
      const stage = request.currentStage;

      const updated = await tx.departmentalRequest.update({
        where: { id: requestId },
        data: {
          currentStatus: RequestStatus.REJECTED,
        },
      });

      await tx.requestWorkflowHistory.create({
        data: {
          requestId,
          actorId: actor.id,
          action: WorkflowAction.REJECT,
          stage,
          previousStatus,
          resultingStatus: RequestStatus.REJECTED,
          rejectionReason,
          comments: comments || null,
        },
      });

      await auditService.log(
        {
          actorId: actor.id,
          action: 'REQUEST_REJECTED',
          entityType: 'DepartmentalRequest',
          entityId: requestId,
          beforeState: { currentStatus: previousStatus, currentStage: stage },
          afterState: { currentStatus: RequestStatus.REJECTED, rejectionReason },
        },
        tx
      );

      setImmediate(async () => {
        await notificationService.createNotification({
          userId: request.requesterId,
          title: 'Request Rejected',
          message: `Your request "${request.title}" was rejected at ${stage}. Reason: ${rejectionReason}`,
          type: NotificationType.REQUEST_REJECTED,
          linkUrl: `/requests/${requestId}`,
        });
      });

      return updated;
    });
  }

  /**
   * Request changes on a request
   */
  async requestChanges(params: {
    requestId: string;
    actor: AuthenticatedUser;
    comments: string;
  }): Promise<DepartmentalRequest> {
    const { requestId, actor, comments } = params;

    return prisma.$transaction(async (tx) => {
      const request = await tx.departmentalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundError('Request not found.');
      }

      if (request.currentStatus !== RequestStatus.UNDER_REVIEW || !request.currentStage) {
        throw new ConflictError(
          `Cannot request changes. Request must be 'UNDER_REVIEW'. Current status: '${request.currentStatus}'.`
        );
      }

      this.validateActorAuthority(actor, request.currentStage, request.targetReviewerId);

      const previousStatus = request.currentStatus;
      const stage = request.currentStage;

      const updated = await tx.departmentalRequest.update({
        where: { id: requestId },
        data: {
          currentStatus: RequestStatus.CHANGES_REQUESTED,
        },
      });

      await tx.requestWorkflowHistory.create({
        data: {
          requestId,
          actorId: actor.id,
          action: WorkflowAction.REQUEST_CHANGES,
          stage,
          previousStatus,
          resultingStatus: RequestStatus.CHANGES_REQUESTED,
          comments,
        },
      });

      await auditService.log(
        {
          actorId: actor.id,
          action: 'REQUEST_CHANGES_REQUESTED',
          entityType: 'DepartmentalRequest',
          entityId: requestId,
          beforeState: { currentStatus: previousStatus, currentStage: stage },
          afterState: { currentStatus: RequestStatus.CHANGES_REQUESTED, comments },
        },
        tx
      );

      setImmediate(async () => {
        await notificationService.createNotification({
          userId: request.requesterId,
          title: 'Changes Requested',
          message: `Reviewer requested revisions for your request "${request.title}": ${comments}`,
          type: NotificationType.CHANGES_REQUESTED,
          linkUrl: `/requests/${requestId}`,
        });
      });

      return updated;
    });
  }

  /**
   * Resubmit request after changes have been made
   */
  async resubmitRequest(params: {
    requestId: string;
    actor: AuthenticatedUser;
    comments: string;
    updatedData?: { title?: string; description?: string; academicContext?: Record<string, unknown> };
  }): Promise<DepartmentalRequest> {
    const { requestId, actor, comments, updatedData } = params;

    return prisma.$transaction(async (tx) => {
      const request = await tx.departmentalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundError('Request not found.');
      }

      if (request.requesterId !== actor.id && actor.role !== Role.DEPARTMENT_ADMIN) {
        throw new ForbiddenError('You can only resubmit your own request.');
      }

      if (request.currentStatus !== RequestStatus.CHANGES_REQUESTED) {
        throw new BadRequestError(
          `Only requests with 'CHANGES_REQUESTED' status can be resubmitted. Current status: '${request.currentStatus}'.`
        );
      }

      // Resume review at the stage where changes were requested (or initial stage)
      const stageToResume = request.currentStage || this.getStagesForCategory(request.category)[0];

      const updated = await tx.departmentalRequest.update({
        where: { id: requestId },
        data: {
          currentStatus: RequestStatus.UNDER_REVIEW,
          currentStage: stageToResume,
          ...(updatedData?.title ? { title: updatedData.title } : {}),
          ...(updatedData?.description ? { description: updatedData.description } : {}),
          ...(updatedData?.academicContext ? { academicContext: updatedData.academicContext as Prisma.InputJsonValue } : {}),
        },
      });

      await tx.requestWorkflowHistory.create({
        data: {
          requestId,
          actorId: actor.id,
          action: WorkflowAction.RESUBMIT,
          stage: stageToResume,
          previousStatus: RequestStatus.CHANGES_REQUESTED,
          resultingStatus: RequestStatus.UNDER_REVIEW,
          comments,
        },
      });

      await auditService.log(
        {
          actorId: actor.id,
          action: 'REQUEST_RESUBMITTED',
          entityType: 'DepartmentalRequest',
          entityId: requestId,
          beforeState: { currentStatus: RequestStatus.CHANGES_REQUESTED },
          afterState: { currentStatus: RequestStatus.UNDER_REVIEW, currentStage: stageToResume, comments },
        },
        tx
      );

      setImmediate(async () => {
        if (request.targetReviewerId) {
          await notificationService.createNotification({
            userId: request.targetReviewerId,
            title: 'Request Resubmitted',
            message: `Revised request "${request.title}" has been resubmitted for your review.`,
            type: NotificationType.REQUEST_RESUBMITTED,
            linkUrl: `/requests/${requestId}`,
          });
        }
      });

      return updated;
    });
  }

  /**
   * Cancel a request
   */
  async cancelRequest(requestId: string, actor: AuthenticatedUser, reason?: string): Promise<DepartmentalRequest> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.departmentalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new NotFoundError('Request not found.');
      }

      // Requester or admin can cancel
      const isOwner = request.requesterId === actor.id;
      const isAdmin = actor.role === Role.DEPARTMENT_ADMIN || actor.role === Role.HOD;

      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('Not authorized to cancel this request.');
      }

      if (
        request.currentStatus === RequestStatus.APPROVED ||
        request.currentStatus === RequestStatus.REJECTED ||
        request.currentStatus === RequestStatus.CANCELLED
      ) {
        throw new BadRequestError(`Cannot cancel request with terminal status '${request.currentStatus}'.`);
      }

      const previousStatus = request.currentStatus;

      const updated = await tx.departmentalRequest.update({
        where: { id: requestId },
        data: {
          currentStatus: RequestStatus.CANCELLED,
        },
      });

      await tx.requestWorkflowHistory.create({
        data: {
          requestId,
          actorId: actor.id,
          action: WorkflowAction.CANCEL,
          stage: request.currentStage,
          previousStatus,
          resultingStatus: RequestStatus.CANCELLED,
          comments: reason || 'Request cancelled by user.',
        },
      });

      await auditService.log(
        {
          actorId: actor.id,
          action: 'REQUEST_CANCELLED',
          entityType: 'DepartmentalRequest',
          entityId: requestId,
          beforeState: { currentStatus: previousStatus },
          afterState: { currentStatus: RequestStatus.CANCELLED },
        },
        tx
      );

      return updated;
    });
  }
}

export const workflowEngine = new WorkflowEngine();
