import { PrismaClient, Role, UserStatus, StudentProgram, StudentStatus, FacultyStatus, ProposalEligibility, ProposalStatus } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  // Clean up existing data in reverse order of dependencies
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.requestWorkflowHistory.deleteMany();
  await prisma.departmentalRequest.deleteMany();
  await prisma.projectAllocation.deleteMany();
  await prisma.projectPreference.deleteMany();
  await prisma.projectProposal.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.facultyProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Create Department
  const cseDept = await prisma.department.create({
    data: {
      code: 'CSE',
      name: 'Computer Science and Engineering',
      description: 'Department of Computer Science and Engineering',
    },
  });
  console.log(`Created Department: ${cseDept.name} (${cseDept.code})`);

  const defaultPassword = 'Password@123';
  const hashedPassword = await hash(defaultPassword);

  // 1. Department Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin.cse@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Department',
      lastName: 'Administrator',
      role: Role.DEPARTMENT_ADMIN,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
    },
  });

  // 2. HOD
  const hodUser = await prisma.user.create({
    data: {
      email: 'hod.cse@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Dr. Rajesh',
      lastName: 'Mukherjee',
      role: Role.HOD,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
      facultyProfile: {
        create: {
          employeeId: 'EMP-HOD-01',
          designation: 'Professor & Head of Department',
          maxProjectCapacity: 4,
          specialization: 'Distributed Systems & Cloud Computing',
          status: FacultyStatus.ACTIVE,
        },
      },
    },
  });

  // 3. Faculty 1
  const facultySharma = await prisma.user.create({
    data: {
      email: 'prof.sharma@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Dr. Vikram',
      lastName: 'Sharma',
      role: Role.FACULTY,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
      facultyProfile: {
        create: {
          employeeId: 'EMP-FAC-01',
          designation: 'Associate Professor',
          maxProjectCapacity: 3,
          specialization: 'Artificial Intelligence & Natural Language Processing',
          status: FacultyStatus.ACTIVE,
        },
      },
    },
  });

  // 4. Faculty 2
  const facultyPatel = await prisma.user.create({
    data: {
      email: 'dr.patel@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Dr. Sneha',
      lastName: 'Patel',
      role: Role.FACULTY,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
      facultyProfile: {
        create: {
          employeeId: 'EMP-FAC-02',
          designation: 'Assistant Professor',
          maxProjectCapacity: 2,
          specialization: 'Cybersecurity & Cryptography',
          status: FacultyStatus.ACTIVE,
        },
      },
    },
  });

  // 5. Student 1 (UG)
  const studentRahul = await prisma.user.create({
    data: {
      email: 'student.rahul@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Rahul',
      lastName: 'Verma',
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
      studentProfile: {
        create: {
          rollNumber: 'UG2021CSE042',
          program: StudentProgram.UG,
          batchYear: 2021,
          currentSemester: 7,
          cgpa: 8.85,
          status: StudentStatus.ACTIVE,
        },
      },
    },
  });

  // 6. Student 2 (PG)
  const studentAnanya = await prisma.user.create({
    data: {
      email: 'student.ananya@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Ananya',
      lastName: 'Roy',
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
      studentProfile: {
        create: {
          rollNumber: 'PG2023CSE012',
          program: StudentProgram.PG,
          batchYear: 2023,
          currentSemester: 3,
          cgpa: 9.2,
          status: StudentStatus.ACTIVE,
        },
      },
    },
  });

  // 7. Student 3 (UG)
  const studentAmit = await prisma.user.create({
    data: {
      email: 'student.amit@university.edu',
      passwordHash: hashedPassword,
      firstName: 'Amit',
      lastName: 'Sen',
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      departmentId: cseDept.id,
      studentProfile: {
        create: {
          rollNumber: 'UG2021CSE088',
          program: StudentProgram.UG,
          batchYear: 2021,
          currentSemester: 7,
          cgpa: 8.1,
          status: StudentStatus.ACTIVE,
        },
      },
    },
  });

  // Create Project Proposals
  const proposal1 = await prisma.projectProposal.create({
    data: {
      title: 'Real-time Autonomous Robot Navigation using SLAM and Deep Reinforcement Learning',
      description: 'Design and deploy an edge-computing SLAM pipeline with DRL for obstacle avoidance in unknown indoor environments.',
      supervisorId: facultySharma.id,
      departmentId: cseDept.id,
      academicTerm: '2024-AUTUMN',
      ugPgEligibility: ProposalEligibility.BOTH,
      capacity: 2,
      prerequisites: 'Proficiency in Python, ROS2, and PyTorch. Minimum CGPA 7.5.',
      applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.PUBLISHED,
    },
  });

  const proposal2 = await prisma.projectProposal.create({
    data: {
      title: 'Zero-Knowledge Proofs for Verifiable Private Credentials in University Systems',
      description: 'Implement zk-SNARKs and decentralized identity standards (W3C DID) for tamper-proof academic credentials verification.',
      supervisorId: facultyPatel.id,
      departmentId: cseDept.id,
      academicTerm: '2024-AUTUMN',
      ugPgEligibility: ProposalEligibility.PG,
      capacity: 1,
      prerequisites: 'Strong background in discrete mathematics and modern cryptography (Rust/C++).',
      applicationDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.PUBLISHED,
    },
  });

  console.log('Seeded Users:');
  console.log(`- Admin: ${adminUser.email} / ${defaultPassword}`);
  console.log(`- HOD: ${hodUser.email} / ${defaultPassword}`);
  console.log(`- Faculty 1: ${facultySharma.email} / ${defaultPassword}`);
  console.log(`- Faculty 2: ${facultyPatel.email} / ${defaultPassword}`);
  console.log(`- Student UG: ${studentRahul.email} / ${defaultPassword}`);
  console.log(`- Student PG: ${studentAnanya.email} / ${defaultPassword}`);
  console.log(`- Student UG 2: ${studentAmit.email} / ${defaultPassword}`);
  console.log(`Seeded Proposals: ${proposal1.title}, ${proposal2.title}`);
  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
