-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'FACULTY', 'HOD', 'DEPARTMENT_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StudentProgram" AS ENUM ('UG', 'PG');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "FacultyStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('COURSE_REGISTRATION', 'BONAFIDE_CERTIFICATE', 'LEAVE_OF_ABSENCE', 'LAB_ACCESS', 'PROJECT_APPROVAL', 'SPECIAL_PERMISSION');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStage" AS ENUM ('FACULTY_REVIEW', 'HOD_REVIEW', 'FINAL_DECISION');

-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('SUBMIT', 'APPROVE_STAGE', 'REJECT', 'REQUEST_CHANGES', 'RESUBMIT', 'CANCEL', 'OVERRIDE_APPROVE');

-- CreateEnum
CREATE TYPE "ProposalEligibility" AS ENUM ('UG', 'PG', 'BOTH');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'REASSIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_SUBMITTED', 'APPROVAL_PENDING', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'CHANGES_REQUESTED', 'REQUEST_RESUBMITTED', 'PROJECT_PUBLISHED', 'PROJECT_ALLOCATED', 'PROJECT_REASSIGNED', 'PROJECT_CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalTaskStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewerAssignmentPolicy" AS ENUM ('ROLE', 'DEPARTMENT_HOD', 'REQUESTER_SELECTED');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "program" "StudentProgram" NOT NULL,
    "academicProgramId" TEXT,
    "batchYear" INTEGER NOT NULL,
    "currentSemester" INTEGER NOT NULL,
    "cgpa" DOUBLE PRECISION,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT,
    "designation" TEXT NOT NULL,
    "maxProjectCapacity" INTEGER NOT NULL DEFAULT 5,
    "specialization" TEXT,
    "status" "FacultyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departmental_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "categoryConfigId" TEXT,
    "workflowDefinitionId" TEXT,
    "academicProgramId" TEXT,
    "academicTermId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "academicContext" JSONB NOT NULL DEFAULT '{}',
    "currentStatus" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" "WorkflowStage",
    "targetReviewerId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departmental_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_workflow_history" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "WorkflowAction" NOT NULL,
    "stage" "WorkflowStage",
    "workflowStageDefinitionId" TEXT,
    "previousStatus" "RequestStatus" NOT NULL,
    "resultingStatus" "RequestStatus" NOT NULL,
    "comments" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_proposals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "academicTerm" TEXT NOT NULL,
    "academicTermId" TEXT,
    "ugPgEligibility" "ProposalEligibility" NOT NULL DEFAULT 'BOTH',
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "prerequisites" TEXT,
    "applicationDeadline" TIMESTAMP(3),
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_preferences" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "academicTerm" TEXT NOT NULL,
    "academicTermId" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "statement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_allocations" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "allocatedById" TEXT NOT NULL,
    "academicTerm" TEXT NOT NULL,
    "academicTermId" TEXT,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "reassignedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "linkUrl" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_programs" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degreeLevel" "StudentProgram" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_category_configs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legacyCategory" "RequestCategory",
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_category_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "categoryConfigId" TEXT,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stage_definitions" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "workflowStage" "WorkflowStage" NOT NULL,
    "requiredReviewerRole" "Role" NOT NULL,
    "assignmentPolicy" "ReviewerAssignmentPolicy" NOT NULL DEFAULT 'ROLE',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "escalationConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_stage_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_tasks" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "workflowStageDefinitionId" TEXT NOT NULL,
    "assignedReviewerId" TEXT,
    "assignedRole" "Role",
    "status" "ApprovalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "approval_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_attachments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_rollNumber_key" ON "student_profiles"("rollNumber");

-- CreateIndex
CREATE INDEX "student_profiles_program_batchYear_idx" ON "student_profiles"("program", "batchYear");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_profiles_userId_key" ON "faculty_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_profiles_employeeId_key" ON "faculty_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "departmental_requests_requesterId_currentStatus_idx" ON "departmental_requests"("requesterId", "currentStatus");

-- CreateIndex
CREATE INDEX "departmental_requests_departmentId_currentStatus_idx" ON "departmental_requests"("departmentId", "currentStatus");

-- CreateIndex
CREATE INDEX "departmental_requests_currentStage_currentStatus_idx" ON "departmental_requests"("currentStage", "currentStatus");

-- CreateIndex
CREATE INDEX "departmental_requests_category_createdAt_idx" ON "departmental_requests"("category", "createdAt");

-- CreateIndex
CREATE INDEX "departmental_requests_currentStatus_submittedAt_idx" ON "departmental_requests"("currentStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "departmental_requests_targetReviewerId_currentStatus_idx" ON "departmental_requests"("targetReviewerId", "currentStatus");

-- CreateIndex
CREATE INDEX "request_workflow_history_requestId_createdAt_idx" ON "request_workflow_history"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "project_proposals_departmentId_status_idx" ON "project_proposals"("departmentId", "status");

-- CreateIndex
CREATE INDEX "project_proposals_supervisorId_academicTerm_idx" ON "project_proposals"("supervisorId", "academicTerm");

-- CreateIndex
CREATE UNIQUE INDEX "project_preferences_studentId_proposalId_academicTerm_key" ON "project_preferences"("studentId", "proposalId", "academicTerm");

-- CreateIndex
CREATE UNIQUE INDEX "project_preferences_studentId_rank_academicTerm_key" ON "project_preferences"("studentId", "rank", "academicTerm");

-- CreateIndex
CREATE INDEX "project_allocations_proposalId_status_idx" ON "project_allocations"("proposalId", "status");

-- CreateIndex
CREATE INDEX "project_allocations_studentId_academicTerm_status_idx" ON "project_allocations"("studentId", "academicTerm", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "academic_programs_departmentId_degreeLevel_isActive_idx" ON "academic_programs"("departmentId", "degreeLevel", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "academic_programs_departmentId_code_key" ON "academic_programs"("departmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_code_key" ON "academic_terms"("code");

-- CreateIndex
CREATE INDEX "academic_terms_academicYear_isActive_idx" ON "academic_terms"("academicYear", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "request_category_configs_code_key" ON "request_category_configs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "request_category_configs_legacyCategory_key" ON "request_category_configs"("legacyCategory");

-- CreateIndex
CREATE INDEX "workflow_definitions_categoryConfigId_isActive_idx" ON "workflow_definitions"("categoryConfigId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_categoryConfigId_version_key" ON "workflow_definitions"("categoryConfigId", "version");

-- CreateIndex
CREATE INDEX "workflow_stage_definitions_workflowDefinitionId_workflowSta_idx" ON "workflow_stage_definitions"("workflowDefinitionId", "workflowStage");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stage_definitions_workflowDefinitionId_position_key" ON "workflow_stage_definitions"("workflowDefinitionId", "position");

-- CreateIndex
CREATE INDEX "approval_tasks_assignedReviewerId_status_createdAt_idx" ON "approval_tasks"("assignedReviewerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_tasks_assignedRole_status_createdAt_idx" ON "approval_tasks"("assignedRole", "status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_tasks_requestId_status_idx" ON "approval_tasks"("requestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "document_attachments_storageKey_key" ON "document_attachments"("storageKey");

-- CreateIndex
CREATE INDEX "document_attachments_requestId_createdAt_idx" ON "document_attachments"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "document_attachments_uploaderId_createdAt_idx" ON "document_attachments"("uploaderId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_academicProgramId_fkey" FOREIGN KEY ("academicProgramId") REFERENCES "academic_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_profiles" ADD CONSTRAINT "faculty_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_profiles" ADD CONSTRAINT "faculty_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_targetReviewerId_fkey" FOREIGN KEY ("targetReviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_categoryConfigId_fkey" FOREIGN KEY ("categoryConfigId") REFERENCES "request_category_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_academicProgramId_fkey" FOREIGN KEY ("academicProgramId") REFERENCES "academic_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departmental_requests" ADD CONSTRAINT "departmental_requests_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_workflow_history" ADD CONSTRAINT "request_workflow_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "departmental_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_workflow_history" ADD CONSTRAINT "request_workflow_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_workflow_history" ADD CONSTRAINT "request_workflow_history_workflowStageDefinitionId_fkey" FOREIGN KEY ("workflowStageDefinitionId") REFERENCES "workflow_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_proposals" ADD CONSTRAINT "project_proposals_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_preferences" ADD CONSTRAINT "project_preferences_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_preferences" ADD CONSTRAINT "project_preferences_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "project_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_preferences" ADD CONSTRAINT "project_preferences_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "project_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_allocations" ADD CONSTRAINT "project_allocations_reassignedFromId_fkey" FOREIGN KEY ("reassignedFromId") REFERENCES "project_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_programs" ADD CONSTRAINT "academic_programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_categoryConfigId_fkey" FOREIGN KEY ("categoryConfigId") REFERENCES "request_category_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stage_definitions" ADD CONSTRAINT "workflow_stage_definitions_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "departmental_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_workflowStageDefinitionId_fkey" FOREIGN KEY ("workflowStageDefinitionId") REFERENCES "workflow_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "departmental_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma schema language cannot express these PostgreSQL checks and partial indexes.
ALTER TABLE "project_proposals"
    ADD CONSTRAINT "project_proposals_capacity_nonnegative_check" CHECK ("capacity" >= 0);
ALTER TABLE "project_preferences"
    ADD CONSTRAINT "project_preferences_rank_positive_check" CHECK ("rank" > 0);
ALTER TABLE "document_attachments"
    ADD CONSTRAINT "document_attachments_size_nonnegative_check" CHECK ("sizeBytes" >= 0);
ALTER TABLE "academic_terms"
    ADD CONSTRAINT "academic_terms_date_range_check" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" <= "endsAt");

CREATE UNIQUE INDEX "project_allocations_one_active_per_student_term_key"
    ON "project_allocations"("studentId", "academicTerm")
    WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "approval_tasks_pending_reviewer_key"
    ON "approval_tasks"("requestId", "workflowStageDefinitionId", "assignedReviewerId")
    WHERE "status" = 'PENDING' AND "assignedReviewerId" IS NOT NULL;
CREATE UNIQUE INDEX "approval_tasks_pending_role_key"
    ON "approval_tasks"("requestId", "workflowStageDefinitionId", "assignedRole")
    WHERE "status" = 'PENDING' AND "assignedRole" IS NOT NULL;
CREATE UNIQUE INDEX "workflow_definitions_one_active_per_category_key"
    ON "workflow_definitions"("categoryConfigId")
    WHERE "isActive" = true AND "categoryConfigId" IS NOT NULL;

CREATE FUNCTION enforce_project_capacity() RETURNS trigger AS $$
DECLARE
    proposal_capacity INTEGER;
    active_allocations INTEGER;
BEGIN
    IF NEW."status" <> 'ACTIVE' THEN
        RETURN NEW;
    END IF;

    SELECT "capacity" INTO proposal_capacity
    FROM "project_proposals"
    WHERE "id" = NEW."proposalId"
    FOR UPDATE;

    SELECT COUNT(*) INTO active_allocations
    FROM "project_allocations"
    WHERE "proposalId" = NEW."proposalId"
        AND "status" = 'ACTIVE'
        AND "id" <> NEW."id";

    IF active_allocations >= proposal_capacity THEN
        RAISE EXCEPTION 'Project capacity exceeded for proposal %', NEW."proposalId"
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "project_allocations_capacity_guard"
    BEFORE INSERT OR UPDATE OF "proposalId", "status" ON "project_allocations"
    FOR EACH ROW EXECUTE FUNCTION enforce_project_capacity();

CREATE FUNCTION reject_historical_record_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "request_workflow_history_append_only"
    BEFORE UPDATE OR DELETE ON "request_workflow_history"
    FOR EACH ROW EXECUTE FUNCTION reject_historical_record_mutation();
CREATE TRIGGER "audit_logs_append_only"
    BEFORE UPDATE OR DELETE ON "audit_logs"
    FOR EACH ROW EXECUTE FUNCTION reject_historical_record_mutation();
