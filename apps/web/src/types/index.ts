export type Role = 'STUDENT' | 'FACULTY' | 'HOD' | 'DEPARTMENT_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type StudentProgram = 'UG' | 'PG';
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'GRADUATED';
export type FacultyStatus = 'ACTIVE' | 'ON_LEAVE' | 'RETIRED';

export type RequestCategory =
  | 'COURSE_REGISTRATION'
  | 'BONAFIDE_CERTIFICATE'
  | 'LEAVE_OF_ABSENCE'
  | 'LAB_ACCESS'
  | 'PROJECT_APPROVAL'
  | 'SPECIAL_PERMISSION';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED';

export type WorkflowStage = 'FACULTY_REVIEW' | 'HOD_REVIEW' | 'FINAL_DECISION';

export type WorkflowAction =
  | 'SUBMIT'
  | 'APPROVE_STAGE'
  | 'REJECT'
  | 'REQUEST_CHANGES'
  | 'RESUBMIT'
  | 'CANCEL'
  | 'OVERRIDE_APPROVE';

export type ProposalEligibility = 'UG' | 'PG' | 'BOTH';
export type ProposalStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AllocationStatus = 'ACTIVE' | 'REASSIGNED' | 'CANCELLED';
export type ApplicationStatus = 'SUBMITTED' | 'WITHDRAWN' | 'SELECTED' | 'REJECTED';

export type NotificationType =
  | 'REQUEST_SUBMITTED'
  | 'APPROVAL_PENDING'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'REQUEST_RESUBMITTED'
  | 'PROJECT_PUBLISHED'
  | 'PROJECT_ALLOCATED'
  | 'PROJECT_REASSIGNED'
  | 'PROJECT_CANCELLED';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface StudentProfile {
  id: string;
  userId: string;
  rollNumber: string;
  program: StudentProgram;
  academicProgramId?: string;
  batchYear: number;
  currentSemester: number;
  cgpa?: number | null;
  status: StudentStatus;
  academicProgram?: {
    id: string;
    code: string;
    name: string;
    degreeLevel: StudentProgram;
  };
}

export interface FacultyProfile {
  id: string;
  userId: string;
  employeeId: string;
  departmentId?: string;
  designation: string;
  maxProjectCapacity: number;
  specialization?: string | null;
  status: FacultyStatus;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  departmentId?: string | null;
  department?: Department | null;
  studentProfile?: StudentProfile | null;
  facultyProfile?: FacultyProfile | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RequestWorkflowHistory {
  id: string;
  requestId: string;
  actorId: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  action: WorkflowAction;
  stage?: WorkflowStage | null;
  previousStatus: RequestStatus;
  resultingStatus: RequestStatus;
  comments?: string | null;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DepartmentalRequest {
  id: string;
  requesterId: string;
  departmentId: string;
  category: RequestCategory;
  categoryConfigId?: string | null;
  academicProgramId?: string | null;
  academicTermId?: string | null;
  title: string;
  description: string;
  academicContext?: Record<string, unknown>;
  currentStatus: RequestStatus;
  currentStage?: WorkflowStage | null;
  targetReviewerId?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  submittedAt?: string | null;
  decidedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  requester?: User;
  targetReviewer?: User | null;
  workflowHistory?: RequestWorkflowHistory[];
  attachments?: DocumentAttachment[];
}

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface ProjectProposal {
  id: string;
  title: string;
  description: string;
  supervisorId: string;
  departmentId: string;
  academicTerm: string;
  ugPgEligibility: ProposalEligibility;
  capacity: number;
  prerequisites?: string | null;
  applicationDeadline?: string | null;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    facultyProfile?: FacultyProfile;
  };
  allocations?: ProjectAllocation[];
  _count?: {
    allocations?: number;
    preferences?: number;
  };
}

export interface ProjectPreference {
  id: string;
  studentId: string;
  proposalId: string;
  rank: number;
  academicTerm: string;
  status: ApplicationStatus;
  statement?: string | null;
  createdAt: string;
  proposal?: ProjectProposal;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentProfile?: StudentProfile;
  };
}

export interface ProjectAllocation {
  id: string;
  proposalId: string;
  studentId: string;
  allocatedById: string;
  academicTerm: string;
  status: AllocationStatus;
  allocatedAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  proposal?: ProjectProposal;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentProfile?: StudentProfile;
  };
  allocatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string | null;
  linkUrl?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | Array<unknown>;
  };
}

export interface RequestReportData {
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
  };
  byCategory: { category: RequestCategory; count: number }[];
  byStatus: { status: RequestStatus; count: number }[];
  byStage: { stage: WorkflowStage; count: number }[];
}

export interface AllocationReportData {
  summary: {
    totalProposals: number;
    totalCapacity: number;
    totalAllocated: number;
    utilizationRate: number;
  };
  facultyWorkload: {
    facultyId: string;
    name: string;
    proposalsCount: number;
    maxCapacity: number;
    allocatedCount: number;
  }[];
}
