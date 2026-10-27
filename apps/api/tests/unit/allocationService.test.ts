import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  prisma,
  Role,
  UserStatus,
  ProposalStatus,
  ProposalEligibility,
  AllocationStatus,
  StudentProgram,
} from '@dms/database';
import { allocationService } from '../../src/services/allocationService';
import { AuthenticatedUser } from '../../src/types';
import { ConflictError, BadRequestError, ForbiddenError } from '../../src/utils/errors';

describe('Unit: Project Allocation Service', () => {
  let hodUser: AuthenticatedUser;
  let studentRahul: AuthenticatedUser;
  let studentAnanya: AuthenticatedUser;
  let studentAmit: AuthenticatedUser;
  let facultySharma: AuthenticatedUser;
  let deptId: string;

  beforeEach(async () => {
    const dept = await prisma.department.findUnique({ where: { code: 'CSE' } });
    deptId = dept!.id;

    const [hod, s1, s2, s3, fac] = await Promise.all([
      prisma.user.findUnique({ where: { email: 'hod.cse@university.edu' } }),
      prisma.user.findUnique({ where: { email: 'student.rahul@university.edu' } }),
      prisma.user.findUnique({ where: { email: 'student.ananya@university.edu' } }),
      prisma.user.findUnique({ where: { email: 'student.amit@university.edu' } }),
      prisma.user.findUnique({ where: { email: 'prof.sharma@university.edu' } }),
    ]);

    hodUser = {
      id: hod!.id,
      email: hod!.email,
      role: Role.HOD,
      status: UserStatus.ACTIVE,
      departmentId: deptId,
      firstName: hod!.firstName,
      lastName: hod!.lastName,
    };

    studentRahul = {
      id: s1!.id,
      email: s1!.email,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: deptId,
      firstName: s1!.firstName,
      lastName: s1!.lastName,
    };

    studentAnanya = {
      id: s2!.id,
      email: s2!.email,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: deptId,
      firstName: s2!.firstName,
      lastName: s2!.lastName,
    };

    studentAmit = {
      id: s3!.id,
      email: s3!.email,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: deptId,
      firstName: s3!.firstName,
      lastName: s3!.lastName,
    };

    facultySharma = {
      id: fac!.id,
      email: fac!.email,
      role: Role.FACULTY,
      status: UserStatus.ACTIVE,
      departmentId: deptId,
      firstName: fac!.firstName,
      lastName: fac!.lastName,
    };

    // Clean up test allocations
    await prisma.projectAllocation.deleteMany({});
  });

  it('strictly enforces project capacity limit', async () => {
    // Create proposal with capacity = 1
    const testProposal = await prisma.projectProposal.create({
      data: {
        title: 'High-Throughput Distributed KV Store',
        description: 'Design and implement Raft consensus based key-value store.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        ugPgEligibility: ProposalEligibility.BOTH,
        capacity: 1, // Only 1 slot
        status: ProposalStatus.PUBLISHED,
      },
    });

    // Allocate first student -> Should succeed
    const firstAlloc = await allocationService.createAllocation(
      {
        proposalId: testProposal.id,
        studentId: studentRahul.id,
        academicTerm: '2024-AUTUMN',
      },
      hodUser
    );
    expect(firstAlloc.status).toBe(AllocationStatus.ACTIVE);

    // Allocate second student -> Must fail with ConflictError (409)
    await expect(
      allocationService.createAllocation(
        {
          proposalId: testProposal.id,
          studentId: studentAnanya.id,
          academicTerm: '2024-AUTUMN',
        },
        hodUser
      )
    ).rejects.toThrow(ConflictError);
  });

  it('prevents duplicate active allocations for the same student in the same academic term', async () => {
    const prop1 = await prisma.projectProposal.create({
      data: {
        title: 'Project Alpha',
        description: 'Description for Alpha project.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        capacity: 5,
        status: ProposalStatus.PUBLISHED,
      },
    });

    const prop2 = await prisma.projectProposal.create({
      data: {
        title: 'Project Beta',
        description: 'Description for Beta project.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        capacity: 5,
        status: ProposalStatus.PUBLISHED,
      },
    });

    // Allocate Rahul to Prop 1
    await allocationService.createAllocation(
      {
        proposalId: prop1.id,
        studentId: studentRahul.id,
        academicTerm: '2024-AUTUMN',
      },
      hodUser
    );

    // Attempt to allocate Rahul to Prop 2 in same term -> Must fail
    await expect(
      allocationService.createAllocation(
        {
          proposalId: prop2.id,
          studentId: studentRahul.id,
          academicTerm: '2024-AUTUMN',
        },
        hodUser
      )
    ).rejects.toThrow(ConflictError);
  });

  it('validates program eligibility (UG vs PG)', async () => {
    // Proposal strictly for PG students
    const pgOnlyProposal = await prisma.projectProposal.create({
      data: {
        title: 'Advanced Formal Methods & Theorem Proving',
        description: 'Using Coq/Isabelle for microkernel verification.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        ugPgEligibility: ProposalEligibility.PG,
        capacity: 2,
        status: ProposalStatus.PUBLISHED,
      },
    });

    // Rahul is a UG student -> Must fail with BadRequestError
    await expect(
      allocationService.createAllocation(
        {
          proposalId: pgOnlyProposal.id,
          studentId: studentRahul.id, // UG
          academicTerm: '2024-AUTUMN',
        },
        hodUser
      )
    ).rejects.toThrow(BadRequestError);

    // Ananya is a PG student -> Should succeed
    const alloc = await allocationService.createAllocation(
      {
        proposalId: pgOnlyProposal.id,
        studentId: studentAnanya.id, // PG
        academicTerm: '2024-AUTUMN',
      },
      hodUser
    );
    expect(alloc.status).toBe(AllocationStatus.ACTIVE);
  });

  it('rejects unauthorized allocation attempts by non-admin roles', async () => {
    const proposal = await prisma.projectProposal.create({
      data: {
        title: 'Quantum Key Distribution Simulator',
        description: 'Simulating BB84 protocol over noisy quantum channels.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        capacity: 2,
        status: ProposalStatus.PUBLISHED,
      },
    });

    // Student attempting to allocate themselves
    await expect(
      allocationService.createAllocation(
        {
          proposalId: proposal.id,
          studentId: studentRahul.id,
          academicTerm: '2024-AUTUMN',
        },
        studentRahul
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it('handles cancellation and reassignment workflow', async () => {
    const prop1 = await prisma.projectProposal.create({
      data: {
        title: 'Compiler Optimization for RISC-V',
        description: 'LLVM pass for vector instructions.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        capacity: 2,
        status: ProposalStatus.PUBLISHED,
      },
    });

    const prop2 = await prisma.projectProposal.create({
      data: {
        title: 'Graph Neural Networks for Drug Discovery',
        description: 'Molecular property prediction with PyG.',
        supervisorId: facultySharma.id,
        departmentId: deptId,
        academicTerm: '2024-AUTUMN',
        capacity: 2,
        status: ProposalStatus.PUBLISHED,
      },
    });

    // Initial allocation
    const initial = await allocationService.createAllocation(
      {
        proposalId: prop1.id,
        studentId: studentAmit.id,
        academicTerm: '2024-AUTUMN',
      },
      hodUser
    );
    expect(initial.status).toBe(AllocationStatus.ACTIVE);

    // Reassign to prop2
    const reassigned = await allocationService.reassignAllocation(
      initial.id,
      {
        newProposalId: prop2.id,
        reason: 'Student demonstrated strong background in graph theory.',
      },
      hodUser
    );
    expect(reassigned.status).toBe(AllocationStatus.ACTIVE);
    expect(reassigned.proposalId).toBe(prop2.id);

    // Check prior allocation is now marked REASSIGNED
    const prior = await prisma.projectAllocation.findUnique({ where: { id: initial.id } });
    expect(prior?.status).toBe(AllocationStatus.REASSIGNED);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
