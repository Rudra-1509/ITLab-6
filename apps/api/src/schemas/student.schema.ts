import { z } from 'zod';
import { StudentProgram, StudentStatus } from '@prisma/client';
import { paginationQuerySchema } from './common.schema';

export const createStudentSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  departmentId: z.string().uuid('Invalid department ID'),
  rollNumber: z.string().trim().min(1, 'Roll number is required'),
  program: z.nativeEnum(StudentProgram),
  batchYear: z.coerce.number().int().min(2000).max(2100),
  currentSemester: z.coerce.number().int().min(1).max(12),
  cgpa: z.coerce.number().min(0).max(10).optional(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  departmentId: z.string().uuid().optional(),
  currentSemester: z.coerce.number().int().min(1).max(12).optional(),
  cgpa: z.coerce.number().min(0).max(10).optional(),
  status: z.nativeEnum(StudentStatus).optional(),
});

export const studentQuerySchema = paginationQuerySchema.extend({
  program: z.nativeEnum(StudentProgram).optional(),
  batchYear: z.coerce.number().int().optional(),
  currentSemester: z.coerce.number().int().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentQueryInput = z.infer<typeof studentQuerySchema>;
