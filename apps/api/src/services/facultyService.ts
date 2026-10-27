import { prisma, Prisma, Role, UserStatus } from '@dms/database';
import { CreateFacultyInput, UpdateFacultyInput, FacultyQueryInput } from '../schemas/faculty.schema';
import { AuthenticatedUser } from '../types';
import { ForbiddenError, NotFoundError, ConflictError } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { auditService } from './auditService';

export class FacultyService {
  async listFaculty(query: FacultyQueryInput, currentUser: AuthenticatedUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: { in: [Role.FACULTY, Role.HOD] },
      facultyProfile: { isNot: null },
    };

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    } else if (currentUser.departmentId && currentUser.role !== Role.DEPARTMENT_ADMIN) {
      where.departmentId = currentUser.departmentId;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { facultyProfile: { is: { employeeId: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    if (query.status) {
      where.facultyProfile = {
        is: {
          status: query.status,
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
          facultyProfile: {
            select: {
              id: true,
              employeeId: currentUser.role !== Role.STUDENT,
              designation: true,
              maxProjectCapacity: true,
              specialization: true,
              status: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { faculty: users, total, page, limit };
  }

  async getFacultyById(id: string, currentUser: AuthenticatedUser) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        role: { in: [Role.FACULTY, Role.HOD] },
      },
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
        facultyProfile: {
          select: {
            id: true,
            employeeId: currentUser.role !== Role.STUDENT,
            designation: true,
            maxProjectCapacity: true,
            specialization: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.facultyProfile) {
      throw new NotFoundError('Faculty member not found.');
    }

    return user;
  }

  async createFaculty(input: CreateFacultyInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD) {
      throw new ForbiddenError('Only Department Admins or HODs can create faculty accounts.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const existingEmp = await prisma.facultyProfile.findUnique({
      where: { employeeId: input.employeeId },
    });
    if (existingEmp) {
      throw new ConflictError('A faculty member with this employee ID already exists.');
    }

    const hashedPassword = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: Role.FACULTY,
          status: UserStatus.ACTIVE,
          departmentId: input.departmentId,
          facultyProfile: {
            create: {
              employeeId: input.employeeId,
              designation: input.designation,
              maxProjectCapacity: input.maxProjectCapacity,
              specialization: input.specialization,
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
          facultyProfile: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'FACULTY_RECORD_CREATED',
          entityType: 'FacultyProfile',
          entityId: newUser.facultyProfile?.id || newUser.id,
          afterState: { email: newUser.email, employeeId: input.employeeId, designation: input.designation },
        },
        tx
      );

      return newUser;
    });

    return result;
  }

  async updateFaculty(id: string, input: UpdateFacultyInput, currentUser: AuthenticatedUser) {
    if (currentUser.role !== Role.DEPARTMENT_ADMIN && currentUser.role !== Role.HOD && currentUser.id !== id) {
      throw new ForbiddenError('Not authorized to update this faculty profile.');
    }

    const user = await prisma.user.findFirst({
      where: { id, role: { in: [Role.FACULTY, Role.HOD] } },
      include: { facultyProfile: true },
    });

    if (!user || !user.facultyProfile) {
      throw new NotFoundError('Faculty member not found.');
    }

    const isSelf = currentUser.id === id;
    // Faculty updating themselves cannot change their own max capacity or status
    if (isSelf && (input.maxProjectCapacity !== undefined || input.status !== undefined)) {
      throw new ForbiddenError('Faculty members cannot alter their own project capacity or administrative status.');
    }

    const beforeState = {
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId: user.departmentId,
      designation: user.facultyProfile.designation,
      maxProjectCapacity: user.facultyProfile.maxProjectCapacity,
      specialization: user.facultyProfile.specialization,
      status: user.facultyProfile.status,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.user.update({
        where: { id },
        data: {
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
          ...(input.departmentId ? { departmentId: input.departmentId } : {}),
          facultyProfile: {
            update: {
              ...(input.designation ? { designation: input.designation } : {}),
              ...(input.maxProjectCapacity !== undefined ? { maxProjectCapacity: input.maxProjectCapacity } : {}),
              ...(input.specialization !== undefined ? { specialization: input.specialization } : {}),
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
          facultyProfile: true,
        },
      });

      await auditService.log(
        {
          actorId: currentUser.id,
          action: 'FACULTY_RECORD_UPDATED',
          entityType: 'FacultyProfile',
          entityId: user.facultyProfile!.id,
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

export const facultyService = new FacultyService();
