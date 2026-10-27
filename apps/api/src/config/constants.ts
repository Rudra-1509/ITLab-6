import { WorkflowStage, RequestCategory, Role } from '@prisma/client';

export const WORKFLOW_CONFIG: Record<
  RequestCategory,
  { stages: WorkflowStage[]; autoApproveFinal?: boolean }
> = {
  [RequestCategory.COURSE_REGISTRATION]: {
    stages: [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION],
  },
  [RequestCategory.BONAFIDE_CERTIFICATE]: {
    stages: [WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION],
  },
  [RequestCategory.LEAVE_OF_ABSENCE]: {
    stages: [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW],
  },
  [RequestCategory.LAB_ACCESS]: {
    stages: [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW],
  },
  [RequestCategory.PROJECT_APPROVAL]: {
    stages: [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION],
  },
  [RequestCategory.SPECIAL_PERMISSION]: {
    stages: [WorkflowStage.FACULTY_REVIEW, WorkflowStage.HOD_REVIEW, WorkflowStage.FINAL_DECISION],
  },
};

export const STAGE_ROLE_MAPPING: Record<WorkflowStage, Role[]> = {
  [WorkflowStage.FACULTY_REVIEW]: [Role.FACULTY, Role.HOD, Role.DEPARTMENT_ADMIN],
  [WorkflowStage.HOD_REVIEW]: [Role.HOD, Role.DEPARTMENT_ADMIN],
  [WorkflowStage.FINAL_DECISION]: [Role.HOD, Role.DEPARTMENT_ADMIN],
};

export const COOKIE_NAME = 'access_token';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
