import { Role, UserStatus, StudentProgram, StudentStatus, FacultyStatus, RequestCategory, RequestStatus, WorkflowStage, WorkflowAction, ProposalEligibility, ProposalStatus, AllocationStatus, NotificationType } from '@prisma/client';
import { Request } from 'express';

export {
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
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  firstName: string;
  lastName: string;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
