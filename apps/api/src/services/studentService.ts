import { prisma, Prisma, Role, UserStatus } from '@dms/database';
import { CreateStudentInput, UpdateStudentInput, StudentQueryInput } from '../schemas/student.schema';
import { AuthenticatedUser } from '../types';
import { ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { auditService } from './auditService';

export class StudentService {
  async listStudents(query: StudentQueryInput, currentUser: AuthenticatedUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.STUDENT,
      studentProfile: { isNot: null },
    };

    // If current user is student, they should not browse all student private profiles
    if (currentUser.role === Role.STUDENT) {
      where.id = currentUser.id;
    } else if (currentUser.departmentId && currentUser.role !== Role.DEPARTMENT_ADMIN) {
      // Scope to department for faculty/HOD unless global admin
      where.departmentId = currentUser.departmentId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { studentProfile: { is: { rollNumber: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    if (query.program || query.batchYear || query.currentSemester || query.status) {
      where.studentProfile = {
        is: {
          ...(query.program ? { program: query.program } : {}),
          ...(query.batchYear ? { batchYear: query.batchYear } : {}),
          ...(query.currentSemester ? { currentSemester: query.currentSemester } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: query.sortOrder || 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          departmentId: true,
          createdAt: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          studentProfile: {
            select: {
              id: true,
              rollNumber: true,
              program: true,
              batchYear: true,
              currentSemester: true,
              cgpa: true,
              status: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { students: users, total, page, limit };
  }

  async getStudentById(id: string, currentUser: AuthenticatedUser) {
    // Insecure direct object reference check: student can only access own record
    if (currentUser.role === Role.STUDENT && currentUser.id !== id) {
      throw new ForbiddenError('Access denied. Students are only permitted to access their own academic records.');
    }

    const user = await prisma.user.findFirst({
      where: { id, role: Role.STUDENT },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        studentProfile: true,
      },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundError('Student academic record not found.');
    }

    // Check departmental access for Faculty/HOD
    if (
      currentUser.role !== Role.DEPARTMENT_ADMIN &&
      currentUser.role !== Role.STUDENT &&
      currentUser.departmentId &&
      user.departmentId !== currentUser.departmentId
    ) {
      throw new ForbiddenError('Access denied. You can only view student records from your department.');
    }

    return user;
  }

  async createStudent(input: CreateStudentInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only Department Admins or HODs can create student records.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const existingRoll = await prisma.studentProfile.findUnique({
      where: { rollNumber: input.rollNumber },
    });
    if (existingRoll) {
      throw new ConflictError('A student with this roll number already exists.');
    }

    const hashedPassword = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          departmentId: input.departmentId,
          studentProfile: {
            create: {
              rollNumber: input.rollNumber,
              program: input.program,
              batchYear: input.batchYear,
              currentSemester: input.currentSemester,
              cgpa: input.cgpa,
            },
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          departmentId: true,
          department: true,
          studentProfile: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'STUDENT_RECORD_CREATED',
          entityType: 'StudentProfile',
          entityId: newUser.studentProfile?.id || newUser.id,
          afterState: { email: newUser.email, rollNumber: input.rollNumber, program: input.program },
        },
        tx
      );

      return newUser;
    });

    return result;
  }

  async updateStudent(id: string, input: UpdateStudentInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only Department Admins or HODs are authorized to update student academic records.');
    }

    const user = await prisma.user.findFirst({
      where: { id, role: Role.STUDENT },
      include: { studentProfile: true },
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundError('Student record not found.');
    }

    const beforeState = {
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId: user.departmentId,
      currentSemester: user.studentProfile.currentSemester,
      cgpa: user.studentProfile.cgpa,
      status: user.studentProfile.status,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.user.update({
        where: { id },
        data: {
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
          studentProfile: {
            update: {
              ...(input.currentSemester !== undefined ? { currentSemester: input.currentSemester } : {}),
              ...(input.cgpa !== undefined ? { cgpa: input.cgpa } : {}),
              ...(input.status ? { status: input.status } : {}),
            },
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          departmentId: true,
          department: true,
          studentProfile: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'STUDENT_RECORD_UPDATED',
          entityType: 'StudentProfile',
          entityId: user.studentProfile!.id,
          beforeState,
          afterState: input as Record<string, unknown>,
        },
        tx
      );

      return res;
    });

    return updated;
  }
}

export const studentService = new StudentService();
