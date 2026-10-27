import { z } from 'zod';
import { FacultyStatus } from '@prisma/client';
import { paginationQuerySchema } from './common.schema';

export const createFacultySchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  departmentId: z.string().uuid('Invalid department ID'),
  employeeId: z.string().trim().min(1, 'Employee ID is required'),
  designation: z.string().trim().min(1, 'Designation is required'),
  maxProjectCapacity: z.coerce.number().int().min(0).max(20).default(5),
  specialization: z.string().trim().optional(),
});

export const updateFacultySchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  departmentId: z.string().uuid().optional(),
  designation: z.string().trim().min(1).optional(),
  maxProjectCapacity: z.coerce.number().int().min(0).max(20).optional(),
  specialization: z.string().trim().optional(),
  status: z.nativeEnum(FacultyStatus).optional(),
});

export const facultyQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(FacultyStatus).optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;
export type FacultyQueryInput = z.infer<typeof facultyQuerySchema>;
