import {
  prisma,
  Prisma,
  Role,
  ProposalStatus,
  ProposalEligibility,
  NotificationType,
} from '@dms/database';
import {
  CreateProposalInput,
  UpdateProposalInput,
  SubmitPreferencesInput,
  ProjectQueryInput,
} from '../schemas/project.schema';
import { AuthenticatedUser } from '../types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export class ProjectService {
  async createProposal(input: CreateProposalInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.FACULTY && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only faculty or HODs can create project proposals.');
    }

    if (!currentUser.departmentId) {
      throw new BadRequestError('User must have an assigned department.');
    }

    // Verify supervisor project capacity limit from faculty profile
    const faculty = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { facultyProfile: true },
    });

    if (!faculty || !faculty.facultyProfile) {
      throw new BadRequestError('Faculty profile is required to propose projects.');
    }

    // Count existing active/published proposals by this supervisor for the term
    const activeProposalsCount = await prisma.projectProposal.count({
      where: {
        supervisorId: currentUser.id,
        academicTerm: input.academicTerm,
        status: { in: [ProposalStatus.PUBLISHED, ProposalStatus.DRAFT] },
      },
    });

    if (activeProposalsCount >= faculty.facultyProfile.maxProjectCapacity) {
      throw new BadRequestError(
        `Cannot create proposal. You have reached your maximum project proposal limit (${faculty.facultyProfile.maxProjectCapacity}) for term '${input.academicTerm}'.`
      );
    }

    const proposal = await prisma.$transaction(async (tx) => {
      const created = await tx.projectProposal.create({
        data: {
          title: input.title,
          description: input.description,
          supervisorId: currentUser.id,
          departmentId: currentUser.departmentId!,
          academicTerm: input.academicTerm,
          ugPgEligibility: input.ugPgEligibility,
          capacity: input.capacity,
          prerequisites: input.prerequisites || null,
          applicationDeadline: input.applicationDeadline || null,
          status: ProposalStatus.DRAFT,
        },
        include: {
          supervisor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          department: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'PROJECT_PROPOSAL_CREATED',
          entityType: 'ProjectProposal',
          entityId: created.id,
          afterState: { title: input.title, academicTerm: input.academicTerm, capacity: input.capacity },
        },
        tx
      );

      return created;
    });

    return proposal;
  }

  async listProposals(query: ProjectQueryInput, currentUser: AuthenticatedUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectProposalWhereInput = {};

    // Students only see PUBLISHED proposals
    if (currentUser.role === Role.STUDENT) {
      where.status = ProposalStatus.PUBLISHED;
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.academicTerm) where.academicTerm = query.academicTerm;
    if (query.ugPgEligibility) where.ugPgEligibility = query.ugPgEligibility;
    if (query.supervisorId) where.supervisorId = query.supervisorId;
    if (query.departmentId) where.departmentId = query.departmentId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { supervisor: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { supervisor: { lastName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [proposals, total] = await Promise.all([
      prisma.projectProposal.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        include: {
          supervisor: {
            select: { id: true, firstName: true, lastName: true, email: true, facultyProfile: true },
          },
          department: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: {
              allocations: {
                where: { status: 'ACTIVE' },
              },
              preferences: true,
            },
          },
        },
      }),
      prisma.projectProposal.count({ where }),
    ]);

    return { proposals, total, page, limit };
  }

  async getProposalById(id: string, currentUser: AuthenticatedUser) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id },
      include: {
        supervisor: {
          select: { id: true, firstName: true, lastName: true, email: true, facultyProfile: true },
        },
        department: true,
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, studentProfile: true },
            },
          },
        },
        _count: {
          select: { preferences: true, allocations: true },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundError('Project proposal not found.');
    }

    // Students cannot view draft or archived proposals
    if (currentUser.role === Role.STUDENT && proposal.status !== ProposalStatus.PUBLISHED) {
      throw new NotFoundError('Project proposal is not currently published.');
    }

    return proposal;
  }

  async updateProposal(id: string, input: UpdateProposalInput, currentUser: AuthenticatedUser) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundError('Project proposal not found.');
    }

    // Only supervisor or admin/HOD can update
    const isSupervisor = proposal.supervisorId === currentUser.id;
    const isAdmin = currentUser.role === Role.DEPARTMENT_ADMIN || currentUser.role === Role.HOD;

    if (!isSupervisor && !isAdmin) {
      throw new ForbiddenError('Only the project supervisor or department administrators can update this proposal.');
    }

    if (proposal.status === ProposalStatus.ARCHIVED) {
      throw new BadRequestError('Archived proposals cannot be modified.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectProposal.update({
        where: { id },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.description ? { description: input.description } : {}),
          ...(input.academicTerm ? { academicTerm: input.academicTerm } : {}),
          ...(input.ugPgEligibility ? { ugPgEligibility: input.ugPgEligibility } : {}),
          ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          ...(input.prerequisites !== undefined ? { prerequisites: input.prerequisites } : {}),
          ...(input.applicationDeadline !== undefined ? { applicationDeadline: input.applicationDeadline } : {}),
        },
        include: {
          supervisor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'PROJECT_PROPOSAL_UPDATED',
          entityType: 'ProjectProposal',
          entityId: id,
          afterState: input as Record<string, unknown>,
        },
        tx
      );

      return res;
    });

    return updated;
  }

  async publishProposal(id: string, currentUser: AuthenticatedUser) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundError('Project proposal not found.');
    }

    if (proposal.supervisorId !== currentUser.id && currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Not authorized to publish this proposal.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectProposal.update({
        where: { id },
        data: { status: ProposalStatus.PUBLISHED },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'PROJECT_PROPOSAL_PUBLISHED',
          entityType: 'ProjectProposal',
          entityId: id,
          beforeState: { status: proposal.status },
          afterState: { status: ProposalStatus.PUBLISHED },
        },
        tx
      );

      return res;
    });

    return updated;
  }

  async archiveProposal(id: string, currentUser: AuthenticatedUser) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundError('Project proposal not found.');
    }

    if (proposal.supervisorId !== currentUser.id && currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Not authorized to archive this proposal.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.projectProposal.update({
        where: { id },
        data: { status: ProposalStatus.ARCHIVED },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'PROJECT_PROPOSAL_ARCHIVED',
          entityType: 'ProjectProposal',
          entityId: id,
          beforeState: { status: proposal.status },
          afterState: { status: ProposalStatus.ARCHIVED },
        },
        tx
      );

      return res;
    });

    return updated;
  }

  async submitPreferences(input: SubmitPreferencesInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.STUDENT) {
      throw new ForbiddenError('Only students can submit project preferences.');
    }

    // Fetch student profile to validate eligibility
    const student = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { studentProfile: true },
    });

    if (!student || !student.studentProfile) {
      throw new BadRequestError('Student profile is missing.');
    }

    const studentProgram = student.studentProfile.program;

    // Verify all proposals exist, are published, for the same term, and match student eligibility (UG/PG)
    const proposalIds = input.preferences.map((p) => p.proposalId);
    const proposals = await prisma.projectProposal.findMany({
      where: {
        id: { in: proposalIds },
        status: ProposalStatus.PUBLISHED,
        academicTerm: input.academicTerm,
      },
    });

    if (proposals.length !== proposalIds.length) {
      throw new BadRequestError(
        'One or more selected proposals are invalid, not published, or do not belong to the selected academic term.'
      );
    }

    // Check UG / PG eligibility
    for (const prop of proposals) {
      if (
        prop.ugPgEligibility !== ProposalEligibility.BOTH &&
        prop.ugPgEligibility.toString() !== studentProgram.toString()
      ) {
        throw new BadRequestError(
          `Proposal "${prop.title}" is restricted to ${prop.ugPgEligibility} students only. Your program is ${studentProgram}.`
        );
      }
    }

    // Transactionally replace or insert student preferences for this term
    await prisma.$transaction(async (tx) => {
      // Remove previous preferences for this term
      await tx.projectPreference.deleteMany({
        where: {
          studentId: currentUser.id,
          academicTerm: input.academicTerm,
        },
      });

      // Insert new preferences
      await tx.projectPreference.createMany({
        data: input.preferences.map((p) => ({
          studentId: currentUser.id,
          proposalId: p.proposalId,
          rank: p.rank,
          academicTerm: input.academicTerm,
        })),
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'PROJECT_PREFERENCES_SUBMITTED',
          entityType: 'ProjectPreference',
          entityId: currentUser.id,
          afterState: { academicTerm: input.academicTerm, preferencesCount: input.preferences.length },
        },
        tx
      );
    });

    return {
      message: 'Project preferences saved successfully.',
      academicTerm: input.academicTerm,
      preferences: input.preferences,
    };
  }

  async getStudentPreferences(studentId: string, academicTerm: string, currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenError('You can only view your own project preferences.');
    }

    return prisma.projectPreference.findMany({
      where: {
        studentId,
        academicTerm,
      },
      orderBy: { rank: 'asc' },
      include: {
        proposal: {
          select: {
            id: true,
            title: true,
            academicTerm: true,
            capacity: true,
            supervisor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async getProposalApplications(proposalId: string, currentUser: AuthenticatedUser) {
    const proposal = await prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundError('Proposal not found.');
    }

    if (
      currentUser.role !== Role.DEPARTMENT_ADMIN &&
      currentUser.role !== Role.HOD &&
      proposal.supervisorId !== currentUser.id
    ) {
      throw new ForbiddenError('Only the supervisor, HOD, or admin can view applications for this proposal.');
    }

    const preferences = await prisma.projectPreference.findMany({
      where: { proposalId },
      orderBy: { rank: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: true,
          },
        },
      },
    });

    return preferences;
  }
}

export const projectService = new ProjectService();
