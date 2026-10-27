import {
  prisma,
  Prisma,
  Role,
  AllocationStatus,
  ProposalEligibility,
  ProposalStatus,
  NotificationType,
} from '@dms/database';
import {
  CreateAllocationInput,
  CancelAllocationInput,
  ReassignAllocationInput,
  AllocationQueryInput,
} from '../schemas/allocation.schema';
import { AuthenticatedUser } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export class AllocationService {
  /**
   * Allocate a student to a project proposal.
   * Uses PostgreSQL transactions with atomic capacity checking to prevent race conditions.
   */
  async createAllocation(input: CreateAllocationInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only Department Admins or HODs are authorized to make project allocations.');
    }

    const allocation = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch proposal with supervisor details
        const proposal = await tx.projectProposal.findUnique({
          where: { id: input.proposalId },
          include: {
            supervisor: true,
          },
        });

        if (!proposal) {
          throw new NotFoundError('Project proposal not found.');
        }

        if (proposal.status !== ProposalStatus.PUBLISHED) {
          throw new BadRequestError(`Cannot allocate to proposal with status '${proposal.status}'. Must be PUBLISHED.`);
        }

        if (proposal.academicTerm !== input.academicTerm) {
          throw new BadRequestError(
            `Academic term mismatch. Proposal belongs to term '${proposal.academicTerm}', requested '${input.academicTerm}'.`
          );
        }

        // 2. Fetch student profile and verify eligibility
        const student = await tx.user.findFirst({
          where: { id: input.studentId, role: Role.STUDENT },
          include: { studentProfile: true },
        });

        if (!student || !student.studentProfile) {
          throw new NotFoundError('Student or student profile not found.');
        }

        // Check program eligibility (UG vs PG)
        if (
          proposal.ugPgEligibility !== ProposalEligibility.BOTH &&
          proposal.ugPgEligibility.toString() !== student.studentProfile.program.toString()
        ) {
          throw new BadRequestError(
            `Student program '${student.studentProfile.program}' is ineligible for this project (requires '${proposal.ugPgEligibility}').`
          );
        }

        // 3. Prevent duplicate active assignments for the student in this academic term
        const existingStudentAllocation = await tx.projectAllocation.findFirst({
          where: {
            studentId: input.studentId,
            academicTerm: input.academicTerm,
            status: AllocationStatus.ACTIVE,
          },
        });

        if (existingStudentAllocation) {
          throw new ConflictError(
            `Student already has an active project allocation for academic term '${input.academicTerm}'. Reassign or cancel prior allocation first.`
          );
        }

        // 4. Concurrency Protection & Capacity Enforcement:
        // Count current ACTIVE allocations for this proposal inside the transaction
        const currentActiveAllocationsCount = await tx.projectAllocation.count({
          where: {
            proposalId: input.proposalId,
            status: AllocationStatus.ACTIVE,
          },
        });

        if (currentActiveAllocationsCount >= proposal.capacity) {
          throw new ConflictError(
            `Project capacity exceeded. Proposal '${proposal.title}' has a capacity of ${proposal.capacity} and currently has ${currentActiveAllocationsCount} active allocations.`
          );
        }

        // 5. Create active allocation record
        const newAllocation = await tx.projectAllocation.create({
          data: {
            proposalId: input.proposalId,
            studentId: input.studentId,
            allocatedById: currentUser.id,
            academicTerm: input.academicTerm,
            status: AllocationStatus.ACTIVE,
          },
          include: {
            proposal: {
              include: {
                supervisor: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, studentProfile: true },
            },
            allocatedBy: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        });

        // 6. Record in audit trail
        await auditService.log(
          {
            actorId: currentUser.id,
            action: 'PROJECT_ALLOCATED',
            entityType: 'ProjectAllocation',
            entityId: newAllocation.id,
            afterState: {
              proposalId: input.proposalId,
              studentId: input.studentId,
              academicTerm: input.academicTerm,
              proposalTitle: proposal.title,
            },
          },
          tx
        );

        return newAllocation;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Trigger asynchronous notifications to student and supervisor
    setImmediate(async () => {
      await notificationService.createNotification({
        userId: allocation.studentId,
        title: 'Project Allocated',
        message: `You have been allocated to the project "${allocation.proposal.title}" under ${allocation.proposal.supervisor.firstName} ${allocation.proposal.supervisor.lastName}.`,
        type: NotificationType.PROJECT_ALLOCATED,
        linkUrl: `/projects/${allocation.proposalId}`,
      });

      await notificationService.createNotification({
        userId: allocation.proposal.supervisor.id,
        title: 'Student Allocated to Project',
        message: `Student ${allocation.student.firstName} ${allocation.student.lastName} has been allocated to your project "${allocation.proposal.title}".`,
        type: NotificationType.PROJECT_ALLOCATED,
        linkUrl: `/projects/${allocation.proposalId}`,
      });
    });

    return allocation;
  }

  /**
   * Cancel an active allocation with reason and audit trail
   */
  async cancelAllocation(allocationId: string, input: CancelAllocationInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only Department Admins or HODs can cancel project allocations.');
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const allocation = await tx.projectAllocation.findUnique({
        where: { id: allocationId },
        include: {
          proposal: {
            include: { supervisor: true },
          },
          student: true,
        },
      });

      if (!allocation) {
        throw new NotFoundError('Project allocation record not found.');
      }

      if (allocation.status !== AllocationStatus.ACTIVE) {
        throw new BadRequestError(`Cannot cancel allocation with status '${allocation.status}'.`);
      }

      const res = await tx.projectAllocation.update({
        where: { id: allocationId },
        data: {
          status: AllocationStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: input.cancellationReason,
        },
        include: {
          proposal: true,
          student: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'PROJECT_ALLOCATION_CANCELLED',
          entityType: 'ProjectAllocation',
          entityId: allocationId,
          beforeState: { status: AllocationStatus.ACTIVE },
          afterState: { status: AllocationStatus.CANCELLED, reason: input.cancellationReason },
        },
        tx
      );

      return res;
    });

    setImmediate(async () => {
      await notificationService.createNotification({
        userId: cancelled.studentId,
        title: 'Project Allocation Cancelled',
        message: `Your allocation for "${cancelled.proposal.title}" has been cancelled. Reason: ${input.cancellationReason}`,
        type: NotificationType.PROJECT_CANCELLED,
      });
    });

    return cancelled;
  }

  /**
   * Reassign a student to a different project
   */
  async reassignAllocation(allocationId: string, input: ReassignAllocationInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only Department Admins or HODs can reassign project allocations.');
    }

    const reassigned = await prisma.$transaction(
      async (tx) => {
        const priorAllocation = await tx.projectAllocation.findUnique({
          where: { id: allocationId },
          include: {
            student: { include: { studentProfile: true } },
            proposal: true,
          },
        });

        if (!priorAllocation) {
          throw new NotFoundError('Allocation record not found.');
        }

        if (priorAllocation.status !== AllocationStatus.ACTIVE) {
          throw new BadRequestError(`Cannot reassign an allocation that is not active (${priorAllocation.status}).`);
        }

        const newProposal = await tx.projectProposal.findUnique({
          where: { id: input.newProposalId },
          include: { supervisor: true },
        });

        if (!newProposal) {
          throw new NotFoundError('New target project proposal not found.');
        }

        if (newProposal.status !== ProposalStatus.PUBLISHED) {
          throw new BadRequestError(`Target proposal is not published (Status: '${newProposal.status}').`);
        }

        // Check capacity on new proposal
        const currentCount = await tx.projectAllocation.count({
          where: {
            proposalId: input.newProposalId,
            status: AllocationStatus.ACTIVE,
          },
        });

        if (currentCount >= newProposal.capacity) {
          throw new ConflictError(
            `Target project capacity exceeded (${currentCount}/${newProposal.capacity} occupied).`
          );
        }

        // Close prior allocation
        await tx.projectAllocation.update({
          where: { id: allocationId },
          data: {
            status: AllocationStatus.REASSIGNED,
            cancelledAt: new Date(),
            cancellationReason: `Reassigned to "${newProposal.title}". Reason: ${input.reason}`,
          },
        });

        // Create new active allocation
        const newAllocation = await tx.projectAllocation.create({
          data: {
            proposalId: input.newProposalId,
            studentId: priorAllocation.studentId,
            allocatedById: currentUser.id,
            academicTerm: priorAllocation.academicTerm,
            status: AllocationStatus.ACTIVE,
            reassignedFromId: allocationId,
          },
          include: {
            proposal: {
              include: { supervisor: true },
            },
            student: true,
          },
        });

        await auditService.log(
          {
            actorId: currentUser.id,
            action: 'PROJECT_ALLOCATION_REASSIGNED',
            entityType: 'ProjectAllocation',
            entityId: newAllocation.id,
            beforeState: { priorAllocationId: allocationId, priorProposalId: priorAllocation.proposalId },
            afterState: { newAllocationId: newAllocation.id, newProposalId: input.newProposalId, reason: input.reason },
          },
          tx
        );

        return newAllocation;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    setImmediate(async () => {
      await notificationService.createNotification({
        userId: reassigned.studentId,
        title: 'Project Reassigned',
        message: `Your project allocation has been reassigned to "${reassigned.proposal.title}".`,
        type: NotificationType.PROJECT_REASSIGNED,
        linkUrl: `/projects/${reassigned.proposalId}`,
      });
    });

    return reassigned;
  }

  async listAllocations(query: AllocationQueryInput, currentUser: AuthenticatedUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectAllocationWhereInput = {};

    // Scoping for students: can only see their own allocations
    if (currentUser.role === Role.STUDENT) {
      where.studentId = currentUser.id;
    } else if (currentUser.role === Role.FACULTY) {
      // Faculty see allocations under their proposals
      where.proposal = { supervisorId: currentUser.id };
    }

    if (query.proposalId) where.proposalId = query.proposalId;
    if (query.studentId) where.studentId = query.studentId;
    if (query.academicTerm) where.academicTerm = query.academicTerm;
    if (query.status) where.status = query.status;

    const [allocations, total] = await Promise.all([
      prisma.projectAllocation.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          proposal: {
            select: {
              id: true,
              title: true,
              academicTerm: true,
              capacity: true,
              supervisor: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              studentProfile: true,
            },
          },
          allocatedBy: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.projectAllocation.count({ where }),
    ]);

    return { allocations, total, page, limit };
  }
}

export const allocationService = new AllocationService();
