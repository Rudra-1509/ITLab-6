import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, Role, UserStatus, RequestCategory, RequestStatus, WorkflowStage } from '@dms/database';
import { workflowEngine } from '../../src/services/workflowEngine';
import { AuthenticatedUser } from '../../src/types';
import { ForbiddenError, BadRequestError, ConflictError } from '../../src/utils/errors';

describe('Unit: Workflow Engine', () => {
  let testDepartmentId: string;
  let studentUser: AuthenticatedUser;
  let facultyUser: AuthenticatedUser;
  let hodUser: AuthenticatedUser;

  beforeEach(async () => {
    // Look up seeded users
    const dept = await prisma.department.findUnique({ where: { code: 'CSE' } });
    testDepartmentId = dept!.id;

    const student = await prisma.user.findUnique({ where: { email: 'student.rahul@university.edu' } });
    const faculty = await prisma.user.findUnique({ where: { email: 'prof.sharma@university.edu' } });
    const hod = await prisma.user.findUnique({ where: { email: 'hod.cse@university.edu' } });

    studentUser = {
      id: student!.id,
      email: student!.email,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: testDepartmentId,
      firstName: student!.firstName,
      lastName: student!.lastName,
    };

    facultyUser = {
      id: faculty!.id,
      email: faculty!.email,
      role: Role.FACULTY,
      status: UserStatus.ACTIVE,
      departmentId: testDepartmentId,
      firstName: faculty!.firstName,
      lastName: faculty!.lastName,
    };

    hodUser = {
      id: hod!.id,
      email: hod!.email,
      role: Role.HOD,
      status: UserStatus.ACTIVE,
      departmentId: testDepartmentId,
      firstName: hod!.firstName,
      lastName: hod!.lastName,
    };
  });

  it('determines the correct ordered stages based on category', () => {
    const courseStages = workflowEngine.getStagesForCategory(RequestCategory.COURSE_REGISTRATION);
    expect(courseStages).toEqual([
      WorkflowStage.FACULTY_REVIEW,
      WorkflowStage.HOD_REVIEW,
      WorkflowStage.FINAL_DECISION,
    ]);

    const bonafideStages = workflowEngine.getStagesForCategory(RequestCategory.BONAFIDE_CERTIFICATE);
    expect(bonafideStages).toEqual([WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION]);
  });

  it('enforces actor role authority per workflow stage', () => {
    // Student cannot approve any review stage
    expect(() =>
      workflowEngine.validateActorAuthority(studentUser, WorkflowStage.FACULTY_REVIEW)
    ).toThrow(ForbiddenError);

    // Faculty CAN approve FACULTY_REVIEW
    expect(() =>
      workflowEngine.validateActorAuthority(facultyUser, WorkflowStage.FACULTY_REVIEW)
    ).not.toThrow();

    // Faculty CANNOT approve HOD_REVIEW stage
    expect(() =>
      workflowEngine.validateActorAuthority(facultyUser, WorkflowStage.HOD_REVIEW)
    ).toThrow(ForbiddenError);

    // HOD CAN approve HOD_REVIEW
    expect(() =>
      workflowEngine.validateActorAuthority(hodUser, WorkflowStage.HOD_REVIEW)
    ).not.toThrow();
  });

  it('executes end-to-end multi-stage approval transition', async () => {
    // 1. Create a draft request
    const request = await prisma.departmentalRequest.create({
      data: {
        requesterId: studentUser.id,
        departmentId: testDepartmentId,
        category: RequestCategory.COURSE_REGISTRATION,
        title: 'Unit Test Course Add Request',
        description: 'Adding elective course on Advanced Neural Networks.',
        currentStatus: RequestStatus.DRAFT,
      },
    });

    // 2. Submit the request -> should advance to UNDER_REVIEW at FACULTY_REVIEW
    const submitted = await workflowEngine.submitRequest(request.id, studentUser);
    expect(submitted.currentStatus).toBe(RequestStatus.UNDER_REVIEW);
    expect(submitted.currentStage).toBe(WorkflowStage.FACULTY_REVIEW);

    // 3. Faculty approves stage 1 -> advances to HOD_REVIEW
    const stage1Approved = await workflowEngine.approveStage({
      requestId: request.id,
      actor: facultyUser,
      comments: 'Recommended for HOD approval.',
    });
    expect(stage1Approved.currentStatus).toBe(RequestStatus.UNDER_REVIEW);
    expect(stage1Approved.currentStage).toBe(WorkflowStage.HOD_REVIEW);

    // 4. HOD approves stage 2 -> advances to FINAL_DECISION
    const stage2Approved = await workflowEngine.approveStage({
      requestId: request.id,
      actor: hodUser,
      comments: 'HOD verified prerequisites.',
    });
    expect(stage2Approved.currentStatus).toBe(RequestStatus.UNDER_REVIEW);
    expect(stage2Approved.currentStage).toBe(WorkflowStage.FINAL_DECISION);

    // 5. Final decision approval -> transitions to APPROVED
    const finalApproved = await workflowEngine.approveStage({
      requestId: request.id,
      actor: hodUser,
      comments: 'Final registration sanctioned.',
    });
    expect(finalApproved.currentStatus).toBe(RequestStatus.APPROVED);
    expect(finalApproved.currentStage).toBeNull();

    // 6. Verify audit history entries exist
    const history = await prisma.requestWorkflowHistory.findMany({
      where: { requestId: request.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(history.length).toBe(4); // SUBMIT + 3 APPROVALS
  });

  it('handles request changes and resubmission correctly', async () => {
    const request = await prisma.departmentalRequest.create({
      data: {
        requesterId: studentUser.id,
        departmentId: testDepartmentId,
        category: RequestCategory.LEAVE_OF_ABSENCE,
        title: 'Medical Leave Request',
        description: 'Need medical leave for 3 days.',
        currentStatus: RequestStatus.UNDER_REVIEW,
        currentStage: WorkflowStage.FACULTY_REVIEW,
      },
    });

    // Faculty requests changes
    const changesRequested = await workflowEngine.requestChanges({
      requestId: request.id,
      actor: facultyUser,
      comments: 'Please attach doctor certificate.',
    });
    expect(changesRequested.currentStatus).toBe(RequestStatus.CHANGES_REQUESTED);

    // Cannot approve while in CHANGES_REQUESTED
    await expect(
      workflowEngine.approveStage({
        requestId: request.id,
        actor: facultyUser,
      })
    ).rejects.toThrow(ConflictError);

    // Student resubmits request
    const resubmitted = await workflowEngine.resubmitRequest({
      requestId: request.id,
      actor: studentUser,
      comments: 'Medical certificate attached in description.',
      updatedData: { description: 'Need medical leave for 3 days. Doctor certificate attached.' },
    });
    expect(resubmitted.currentStatus).toBe(RequestStatus.UNDER_REVIEW);
    expect(resubmitted.currentStage).toBe(WorkflowStage.FACULTY_REVIEW);
  });

  it('rejects a request with mandatory reason', async () => {
    const request = await prisma.departmentalRequest.create({
      data: {
        requesterId: studentUser.id,
        departmentId: testDepartmentId,
        category: RequestCategory.LAB_ACCESS,
        title: 'Special Lab Access',
        description: 'Need 24/7 access to server room.',
        currentStatus: RequestStatus.UNDER_REVIEW,
        currentStage: WorkflowStage.FACULTY_REVIEW,
      },
    });

    const rejected = await workflowEngine.rejectRequest({
      requestId: request.id,
      actor: facultyUser,
      rejectionReason: 'Security policy prohibits student after-hours physical server room access.',
    });

    expect(rejected.currentStatus).toBe(RequestStatus.REJECTED);

    const history = await prisma.requestWorkflowHistory.findFirst({
      where: { requestId: request.id, action: 'REJECT' },
    });
    expect(history).not.toBeNull();
    expect(history?.rejectionReason).toContain('Security policy prohibits');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
