# Database Contract

The database package owns `prisma/schema.prisma`, migrations, and the development seed. It uses PostgreSQL and the repository-pinned Prisma CLI/client 5.22.x. API services import the generated client from `@dms/database`; model and enum changes must be coordinated with those consumers.

## Local Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to a local PostgreSQL database, for example `postgresql://postgres:postgres@localhost:5432/department_management?schema=public`.
2. Install root dependencies with `npm install`.
3. Create and apply a local development migration with `npm run db:migrate:dev -- --name init`.
4. Generate the client with `npm run db:generate` (Migrate also generates it during development).
5. Seed the local database with `npm run db:seed`.
6. For an already-created migration in another environment, apply it using `npm run db:migrate:deploy`.

`npm run db:push` remains available for disposable prototyping only; it does not create migration history and should not be used to deploy schema changes. Never run `migrate dev`, `db push`, or a reset against a shared or production database. The committed `.env.example` contains placeholders only.

The seed refuses to run unless `NODE_ENV=development` and `DATABASE_URL` points to localhost/127.0.0.1 with a database name containing `department_management`. It upserts a fixed development dataset and does not clear unrelated data. Its documented demo password defaults to `Password@123`; override it with `DEMO_SEED_PASSWORD` for local work. Never use these credentials outside a disposable development database.

## Entity Relationship Diagram

```mermaid
erDiagram
  Department ||--o{ User : has
  Department ||--o{ AcademicProgram : offers
  Department ||--o{ FacultyProfile : employs
  User ||--o| StudentProfile : profile
  User ||--o| FacultyProfile : profile
  AcademicProgram ||--o{ StudentProfile : enrolls
  AcademicProgram ||--o{ DepartmentalRequest : scope
  AcademicTerm ||--o{ DepartmentalRequest : scope
  AcademicTerm ||--o{ ProjectProposal : offers
  User ||--o{ DepartmentalRequest : requests
  RequestCategoryConfig ||--o{ DepartmentalRequest : classifies
  RequestCategoryConfig ||--o{ WorkflowDefinition : configures
  WorkflowDefinition ||--o{ WorkflowStageDefinition : orders
  WorkflowDefinition ||--o{ DepartmentalRequest : snapshots
  DepartmentalRequest ||--o{ ApprovalTask : assigns
  WorkflowStageDefinition ||--o{ ApprovalTask : defines
  User ||--o{ ApprovalTask : reviews
  DepartmentalRequest ||--o{ RequestWorkflowHistory : records
  User ||--o{ RequestWorkflowHistory : acts
  DepartmentalRequest ||--o{ DocumentAttachment : contains
  User ||--o{ DocumentAttachment : uploads
  User ||--o{ ProjectProposal : supervises
  ProjectProposal ||--o{ ProjectPreference : receives
  User ||--o{ ProjectPreference : ranks
  ProjectProposal ||--o{ ProjectAllocation : assigned
  User ||--o{ ProjectAllocation : allocated
  User ||--o{ Notification : receives
  User ||--o{ AuditLog : acts
```

## Models And Enums

- `Department`: unique code, name, description, active state, timestamps.
- `User`: unique email, password hash, one initial role, account status, optional department. Multiple future roles require replacing `role` with a `UserRole` join model and updating authorization checks.
- `StudentProfile`: unique user and registration number, UG/PG level, optional normalized academic program, batch, semester, CGPA, enrollment status.
- `FacultyProfile`: unique user and employee ID, required department, designation, capacity, specialization, status.
- `AcademicProgram`: unique department/code, degree level, active state.
- `AcademicTerm`: unique code, academic year, optional date bounds, active state.
- `RequestCategoryConfig`: configurable category catalogue, optionally mapped to the current API `RequestCategory` enum.
- `DepartmentalRequest`: requester, legacy category, optional catalogue/workflow/program/term links, lifecycle state, reviewer, submission/decision times, version, and legacy flexible `academicContext` JSON.
- `WorkflowDefinition` and `WorkflowStageDefinition`: versioned category-specific sequence, ordered stages, reviewer role/policy, mandatory flag, optional flexible escalation metadata.
- `ApprovalTask`: current action assignment; `RequestWorkflowHistory`: append-only decisions and state transitions.
- `ProjectProposal`: supervisor, department, legacy term code plus optional normalized term relation, UG/PG eligibility, non-negative capacity (database constraint), deadline and lifecycle state.
- `ProjectPreference`: application status and optional statement, unique student/proposal/term application and unique student rank/term.
- `ProjectAllocation`: actual assignment with allocator, legacy term plus optional normalized term relation, status and cancellation/reassignment metadata with a self-reference to the prior allocation.
- `Notification`: recipient, content, type, optional related entity pointer and read timestamp/status.
- `AuditLog`: actor, action, entity pointer, snapshots, correlation ID and timestamp.
- `DocumentAttachment`: request, uploader, original filename, private storage key, MIME type and byte size; file bytes remain outside PostgreSQL.

Enums retained for current API compatibility: `Role`, `UserStatus`, `StudentProgram`, `StudentStatus`, `FacultyStatus`, `RequestCategory`, `RequestStatus`, `WorkflowStage`, `WorkflowAction`, `ProposalEligibility`, `ProposalStatus`, `AllocationStatus`, and `NotificationType`. New database enums: `ApprovalTaskStatus`, `ApplicationStatus`, and `ReviewerAssignmentPolicy`.

## Constraints, Indexes, And Operational Invariants

Unique constraints cover department code, user email, student user/roll number, faculty user/employee ID, program department/code, academic term code, category code and optional legacy mapping, workflow category/version and stage position, student/proposal/term preference, preference rank per student/term, and attachment storage key. Queue, request status/date, reviewer, term, supervisor, recipient/read/time, and audit entity/time indexes support expected API lookups.

The initial migration adds PostgreSQL checks and partial unique indexes that Prisma schema syntax cannot express: non-negative project capacity; no more than one active allocation per student and academic term; and no duplicate pending task for the same request/stage/reviewer or request/stage/role. An allocation trigger locks its proposal row before counting active allocations and rejects writes beyond capacity, protecting against concurrent writers that bypass API checks. Keep the API's serializable transaction and retry PostgreSQL serialization failures (`P2034`); capacity enforcement must not be reduced to a count-only pre-check.

Requests and historical records use restrictive foreign keys rather than cascading deletion. Deactivate or archive academic entities. Audit and workflow-history rows are append-only by application convention; the initial migration additionally rejects `UPDATE` and `DELETE` on those tables. Use a dedicated migration/maintenance database role for controlled retention work, never the ordinary API role.

A request stores the selected `workflowDefinitionId` when configured. Treat workflow definitions and their stages as immutable after activation: create a new version for future requests; existing requests continue to reference their original version. The current API workflow engine still selects stages from `apps/api/src/config/constants.ts` and writes `RequestWorkflowHistory`; it does not yet create `ApprovalTask` rows or consult `WorkflowDefinition`. Moving runtime workflow selection to these tables is a coordinated backend change, not automatic behavior from this schema migration.

Academic-term IDs are nullable compatibility links because current API contracts accept term code strings. Keep the code and relation consistent when introducing normalized terms; migrate service inputs and backfill existing rows before making these links required.

## Example Backend Queries

```ts
// Reviewer queue
const tasks = await prisma.approvalTask.findMany({
  where: { assignedReviewerId: reviewerId, status: 'PENDING' },
  include: { request: true, workflowStageDefinition: true },
  orderBy: { createdAt: 'asc' },
});

// Request history
const history = await prisma.requestWorkflowHistory.findMany({
  where: { requestId },
  include: { actor: true, workflowStageDefinition: true },
  orderBy: { createdAt: 'asc' },
});

// Unread notifications
const notifications = await prisma.notification.findMany({
  where: { userId, isRead: false },
  orderBy: { createdAt: 'desc' },
});

// Active project capacity usage
const activeCount = await prisma.projectAllocation.count({
  where: { proposalId, status: 'ACTIVE' },
});
```

Use a transaction for the full approval transition (request state, task completion/creation, history, and audit) and for allocation plus audit. The allocation database trigger is the final capacity guard; the service should still return a domain-level conflict and retry serialization failures where appropriate.
