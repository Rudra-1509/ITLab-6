import 'dotenv/config';
import {
  PrismaClient,
  Role,
  UserStatus,
  StudentProgram,
  StudentStatus,
  FacultyStatus,
  RequestCategory,
  RequestStatus,
  WorkflowStage,
  WorkflowAction,
  ProposalEligibility,
  ProposalStatus,
  AllocationStatus,
  NotificationType,
  ApprovalTaskStatus,
  ReviewerAssignmentPolicy,
} from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();
const ids = {
  programUg: '11111111-1111-4111-8111-111111111111',
  programPg: '22222222-2222-4222-8222-222222222222',
  term: '33333333-3333-4333-8333-333333333333',
  workflowBonafide: '44444444-4444-4444-8444-444444444441',
  workflowProject: '44444444-4444-4444-8444-444444444442',
  requestDraft: '55555555-5555-4555-8555-555555555551',
  requestReview: '55555555-5555-4555-8555-555555555552',
  requestApproved: '55555555-5555-4555-8555-555555555553',
  proposalOne: '66666666-6666-4666-8666-666666666661',
  proposalTwo: '66666666-6666-4666-8666-666666666662',
  preferenceOne: '77777777-7777-4777-8777-777777777771',
  allocationOne: '88888888-8888-4888-8888-888888888881',
  historyOne: '99999999-9999-4999-8999-999999999991',
  taskOne: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  notificationOne: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  auditOne: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (process.env.NODE_ENV !== 'development' || !/localhost|127\.0\.0\.1/.test(databaseUrl) || !/department_management/.test(databaseUrl)) {
    throw new Error('Seed refused: set NODE_ENV=development and use a localhost database named department_management.');
  }

  const password = process.env.DEMO_SEED_PASSWORD ?? 'LocalDev@1234';
  const passwordHash = await hash(password);
  const department = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: { name: 'Computer Science and Engineering', isActive: true },
    create: { code: 'CSE', name: 'Computer Science and Engineering', description: 'Development seed department' },
  });

  const programUg = await prisma.academicProgram.upsert({
    where: { id: ids.programUg },
    update: { name: 'Bachelor of Technology in Computer Science', isActive: true },
    create: { id: ids.programUg, departmentId: department.id, code: 'BTECH-CSE', name: 'Bachelor of Technology in Computer Science', degreeLevel: StudentProgram.UG },
  });
  const programPg = await prisma.academicProgram.upsert({
    where: { id: ids.programPg },
    update: { name: 'Master of Technology in Computer Science', isActive: true },
    create: { id: ids.programPg, departmentId: department.id, code: 'MTECH-CSE', name: 'Master of Technology in Computer Science', degreeLevel: StudentProgram.PG },
  });
  const term = await prisma.academicTerm.upsert({
    where: { code: '2026-AUTUMN' },
    update: { isActive: true },
    create: { id: ids.term, code: '2026-AUTUMN', name: 'Autumn 2026', academicYear: '2026-2027', isActive: true },
  });

  const categories = [
    [RequestCategory.COURSE_REGISTRATION, 'Course registration'],
    [RequestCategory.BONAFIDE_CERTIFICATE, 'Bonafide certificate'],
    [RequestCategory.LEAVE_OF_ABSENCE, 'Leave of absence'],
    [RequestCategory.LAB_ACCESS, 'Laboratory access'],
    [RequestCategory.PROJECT_APPROVAL, 'Project approval'],
    [RequestCategory.SPECIAL_PERMISSION, 'Special permission'],
  ] as const;
  const categoryRecords = new Map<RequestCategory, { id: string }>();
  for (const [category, name] of categories) {
    const record = await prisma.requestCategoryConfig.upsert({
      where: { code: category },
      update: { name, isActive: true },
      create: { code: category, legacyCategory: category, name },
    });
    categoryRecords.set(category, record);
  }

  const workflowRecords = [
    { id: ids.workflowBonafide, category: RequestCategory.BONAFIDE_CERTIFICATE, name: 'Bonafide review', stages: [WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION] },
    { id: ids.workflowProject, category: RequestCategory.PROJECT_APPROVAL, name: 'Project approval review', stages: [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION] },
  ];
  for (const workflow of workflowRecords) {
    const categoryConfig = categoryRecords.get(workflow.category)!;
    const definition = await prisma.workflowDefinition.upsert({
      where: { categoryConfigId_version: { categoryConfigId: categoryConfig.id, version: 1 } },
      update: { name: workflow.name, isActive: true },
      create: { id: workflow.id, categoryConfigId: categoryConfig.id, name: workflow.name, version: 1, isActive: true },
    });
    for (const [index, stage] of workflow.stages.entries()) {
      await prisma.workflowStageDefinition.upsert({
        where: { workflowDefinitionId_position: { workflowDefinitionId: definition.id, position: index + 1 } },
        update: { workflowStage: stage },
        create: {
          workflowDefinitionId: definition.id,
          position: index + 1,
          name: stage.replaceAll('_', ' '),
          workflowStage: stage,
          requiredReviewerRole: stage === WorkflowStage.FACULTY_REVIEW ? Role.FACULTY : Role.HOD,
          assignmentPolicy: stage === WorkflowStage.FACULTY_REVIEW ? ReviewerAssignmentPolicy.REQUESTER_SELECTED : ReviewerAssignmentPolicy.DEPARTMENT_HOD,
        },
      });
    }
  }

  const users = [
    { email: 'admin.cse@university.edu', firstName: 'Department', lastName: 'Administrator', role: Role.DEPARTMENT_ADMIN },
    { email: 'hod.cse@university.edu', firstName: 'Rajesh', lastName: 'Mukherjee', role: Role.HOD, employeeId: 'EMP-HOD-01', designation: 'Professor and Head', specialization: 'Distributed systems' },
    { email: 'prof.sharma@university.edu', firstName: 'Vikram', lastName: 'Sharma', role: Role.FACULTY, employeeId: 'EMP-FAC-01', designation: 'Associate Professor', specialization: 'Artificial intelligence' },
    { email: 'dr.patel@university.edu', firstName: 'Sneha', lastName: 'Patel', role: Role.FACULTY, employeeId: 'EMP-FAC-02', designation: 'Assistant Professor', specialization: 'Information security' },
    { email: 'student.rahul@university.edu', firstName: 'Rahul', lastName: 'Verma', role: Role.STUDENT, rollNumber: 'UG2022CSE042', program: StudentProgram.UG, batchYear: 2022, semester: 7 },
    { email: 'student.ananya@university.edu', firstName: 'Ananya', lastName: 'Roy', role: Role.STUDENT, rollNumber: 'PG2025CSE012', program: StudentProgram.PG, batchYear: 2025, semester: 3 },
    { email: 'student.amit@university.edu', firstName: 'Amit', lastName: 'Sen', role: Role.STUDENT, rollNumber: 'UG2022CSE088', program: StudentProgram.UG, batchYear: 2022, semester: 7 },
    { email: 'student.mira@university.edu', firstName: 'Mira', lastName: 'Das', role: Role.STUDENT, rollNumber: 'PG2025CSE018', program: StudentProgram.PG, batchYear: 2025, semester: 3 },
  ];
  const userRecords = new Map<string, { id: string; role: Role }>();
  for (const seedUser of users) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: { firstName: seedUser.firstName, lastName: seedUser.lastName, role: seedUser.role, status: UserStatus.ACTIVE, departmentId: department.id, passwordHash },
      create: { email: seedUser.email, firstName: seedUser.firstName, lastName: seedUser.lastName, role: seedUser.role, status: UserStatus.ACTIVE, departmentId: department.id, passwordHash },
    });
    userRecords.set(seedUser.email, user);
    if ('employeeId' in seedUser) {
      await prisma.facultyProfile.upsert({
        where: { userId: user.id },
        update: { employeeId: seedUser.employeeId, designation: seedUser.designation, specialization: seedUser.specialization, departmentId: department.id, status: FacultyStatus.ACTIVE },
        create: { userId: user.id, employeeId: seedUser.employeeId, designation: seedUser.designation, specialization: seedUser.specialization, departmentId: department.id },
      });
    }
    if ('rollNumber' in seedUser) {
      const academicProgram = seedUser.program === StudentProgram.UG ? programUg : programPg;
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { rollNumber: seedUser.rollNumber, program: seedUser.program, academicProgramId: academicProgram.id, batchYear: seedUser.batchYear, currentSemester: seedUser.semester, status: StudentStatus.ACTIVE },
        create: { userId: user.id, rollNumber: seedUser.rollNumber, program: seedUser.program, academicProgramId: academicProgram.id, batchYear: seedUser.batchYear, currentSemester: seedUser.semester },
      });
    }
  }
  const userId = (email: string) => userRecords.get(email)!.id;

  const proposalData = [
    { id: ids.proposalOne, title: 'Accessible campus navigation assistant', description: 'Build a mobile-friendly indoor navigation prototype for campus buildings.', supervisorId: userId('prof.sharma@university.edu'), capacity: 2, eligibility: ProposalEligibility.BOTH },
    { id: ids.proposalTwo, title: 'Privacy-preserving academic credentials', description: 'Prototype verifiable credentials for sharing academic achievements.', supervisorId: userId('dr.patel@university.edu'), capacity: 1, eligibility: ProposalEligibility.PG },
  ];
  for (const proposal of proposalData) {
    await prisma.projectProposal.upsert({
      where: { id: proposal.id },
      update: { ...proposal, departmentId: department.id, academicTerm: term.code, academicTermId: term.id, status: ProposalStatus.PUBLISHED },
      create: { ...proposal, departmentId: department.id, academicTerm: term.code, academicTermId: term.id, status: ProposalStatus.PUBLISHED },
    });
  }

  const requestData = [
    { id: ids.requestDraft, email: 'student.amit@university.edu', category: RequestCategory.BONAFIDE_CERTIFICATE, title: 'Bonafide certificate', currentStatus: RequestStatus.DRAFT, workflowDefinitionId: null },
    { id: ids.requestReview, email: 'student.rahul@university.edu', category: RequestCategory.PROJECT_APPROVAL, title: 'Capstone project approval', currentStatus: RequestStatus.UNDER_REVIEW, workflowDefinitionId: ids.workflowProject },
    { id: ids.requestApproved, email: 'student.ananya@university.edu', category: RequestCategory.BONAFIDE_CERTIFICATE, title: 'Research internship certificate', currentStatus: RequestStatus.APPROVED, workflowDefinitionId: ids.workflowBonafide },
  ];
  for (const request of requestData) {
    const categoryConfig = categoryRecords.get(request.category)!;
    const workflowDefinition = request.workflowDefinitionId ? await prisma.workflowDefinition.findUniqueOrThrow({ where: { id: request.workflowDefinitionId } }) : null;
    await prisma.departmentalRequest.upsert({
      where: { id: request.id },
      update: { requesterId: userId(request.email), departmentId: department.id, category: request.category, categoryConfigId: categoryConfig.id, workflowDefinitionId: workflowDefinition?.id, academicProgramId: request.email.includes('ananya') || request.email.includes('mira') ? programPg.id : programUg.id, academicTermId: term.id, title: request.title, description: 'Development seed request for local API testing.', currentStatus: request.currentStatus, currentStage: request.currentStatus === RequestStatus.UNDER_REVIEW ? WorkflowStage.FACULTY_REVIEW : null, submittedAt: request.currentStatus === RequestStatus.DRAFT ? null : new Date('2026-10-01T10:00:00Z'), decidedAt: request.currentStatus === RequestStatus.APPROVED ? new Date('2026-10-02T10:00:00Z') : null },
      create: { id: request.id, requesterId: userId(request.email), departmentId: department.id, category: request.category, categoryConfigId: categoryConfig.id, workflowDefinitionId: workflowDefinition?.id, academicProgramId: request.email.includes('ananya') || request.email.includes('mira') ? programPg.id : programUg.id, academicTermId: term.id, title: request.title, description: 'Development seed request for local API testing.', currentStatus: request.currentStatus, currentStage: request.currentStatus === RequestStatus.UNDER_REVIEW ? WorkflowStage.FACULTY_REVIEW : null, submittedAt: request.currentStatus === RequestStatus.DRAFT ? null : new Date('2026-10-01T10:00:00Z'), decidedAt: request.currentStatus === RequestStatus.APPROVED ? new Date('2026-10-02T10:00:00Z') : null },
    });
  }

  await prisma.requestWorkflowHistory.createMany({
    skipDuplicates: true,
    data: [{ id: ids.historyOne, requestId: ids.requestApproved, actorId: userId('hod.cse@university.edu'), action: WorkflowAction.APPROVE_STAGE, stage: WorkflowStage.HOD_REVIEW, previousStatus: RequestStatus.UNDER_REVIEW, resultingStatus: RequestStatus.APPROVED, comments: 'Approved in development seed.' }],
  });
  const facultyStage = await prisma.workflowStageDefinition.findFirstOrThrow({ where: { workflowDefinitionId: ids.workflowProject, position: 1 } });
  await prisma.approvalTask.upsert({
    where: { id: ids.taskOne },
    update: { assignedReviewerId: userId('prof.sharma@university.edu'), status: ApprovalTaskStatus.PENDING },
    create: { id: ids.taskOne, requestId: ids.requestReview, workflowStageDefinitionId: facultyStage.id, assignedReviewerId: userId('prof.sharma@university.edu'), status: ApprovalTaskStatus.PENDING },
  });

  await prisma.projectPreference.upsert({
    where: { id: ids.preferenceOne },
    update: { studentId: userId('student.rahul@university.edu'), proposalId: ids.proposalOne, academicTerm: term.code, academicTermId: term.id, rank: 1 },
    create: { id: ids.preferenceOne, studentId: userId('student.rahul@university.edu'), proposalId: ids.proposalOne, academicTerm: term.code, academicTermId: term.id, rank: 1 },
  });
  await prisma.projectAllocation.upsert({
    where: { id: ids.allocationOne },
    update: { studentId: userId('student.ananya@university.edu'), proposalId: ids.proposalTwo, allocatedById: userId('hod.cse@university.edu'), academicTerm: term.code, academicTermId: term.id, status: AllocationStatus.ACTIVE },
    create: { id: ids.allocationOne, studentId: userId('student.ananya@university.edu'), proposalId: ids.proposalTwo, allocatedById: userId('hod.cse@university.edu'), academicTerm: term.code, academicTermId: term.id, status: AllocationStatus.ACTIVE },
  });
  await prisma.notification.upsert({
    where: { id: ids.notificationOne },
    update: { userId: userId('student.rahul@university.edu'), isRead: false },
    create: { id: ids.notificationOne, userId: userId('student.rahul@university.edu'), title: 'Request under review', message: 'Your capstone project approval is awaiting review.', type: NotificationType.APPROVAL_PENDING, relatedEntityType: 'DepartmentalRequest', relatedEntityId: ids.requestReview },
  });
  await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: [{ id: ids.auditOne, actorId: userId('hod.cse@university.edu'), action: 'SEED_PROJECT_ALLOCATION', entityType: 'ProjectAllocation', entityId: ids.allocationOne, afterState: { status: AllocationStatus.ACTIVE }, correlationId: 'local-development-seed' }],
  });

  console.log(`Development seed complete. Demo password: ${password}`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
