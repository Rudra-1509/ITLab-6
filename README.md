# University Departmental Management System — REST API & Business Logic

A robust, enterprise-grade RESTful API and business logic backend for university departmental management, handling undergraduate and postgraduate students, faculty members, HOD approvals, multi-stage request workflows, project proposals, transactional project allocation with capacity control, notifications, and academic workload reports.

---

## 1. Technology Stack & Architectural Decisions

- **Runtime & Language**: Node.js v22+ with TypeScript in strict mode.
- **Web Framework**: Express 4.x with layered architecture (Routes, Controllers, Services, Schemas, Middleware, Utilities).
- **Database & ORM**: PostgreSQL with Prisma ORM 5.22 LTS.
- **Authentication**: Argon2id password hashing (`@node-rs/argon2` with bcrypt fallback), HTTP-only Secure SameSite session cookies, and Authorization Bearer JWT support.
- **Input Validation**: Zod schemas validating route parameters, queries, and request bodies.
- **Security & Headers**: Helmet, CORS with credential handling, memory rate-limiting on sensitive endpoints (e.g. login).
- **Concurrency & Transactions**: PostgreSQL Serializable transactions with atomic checks to guarantee project capacity limits and prevent double allocations.
- **Testing**: Vitest + Supertest integration and unit test suite.
- **API Documentation**: OpenAPI 3.0 specification with interactive Swagger UI mounted at `/api/v1/docs`.

---

## 2. Layered Architecture

```
apps/api/src/
├── app.ts                 # Express app initialization, security middleware & Swagger UI
├── server.ts              # Server bootstrap and graceful shutdown hooks
├── config/
│   ├── env.ts             # Zod-validated environment configuration
│   └── constants.ts       # Workflow stage mapping, roles, and pagination defaults
├── middleware/
│   ├── authenticate.ts    # JWT/cookie session verification and active user checks
│   ├── authorize.ts       # Role-based access control (RBAC) middleware
│   ├── validate.ts        # Zod validation middleware for body, query, and params
│   ├── rateLimiter.ts     # In-memory IP rate limiter for login
│   └── errorHandler.ts    # Centralized error handler (AppError, Prisma, Zod, 404, 500)
├── schemas/               # Zod request validation schemas
├── services/
│   ├── authService.ts     # Credential verification, session generation, audit logging
│   ├── studentService.ts  # Academic student profiles CRUD & IDOR protection
│   ├── facultyService.ts  # Faculty profile management & capacity constraints
│   ├── workflowEngine.ts  # State machine for multi-stage departmental approvals
│   ├── requestService.ts  # Departmental requests lifecycle (draft, submit, cancel)
│   ├── projectService.ts  # Proposal CRUD, publishing, eligibility & student preferences
│   ├── allocationService.ts # Concurrency-safe project allocation & reassignment
│   ├── notificationService.ts # Event-triggered non-blocking notifications
│   ├── auditService.ts    # Append-only immutable audit trail logging
│   └── reportService.ts   # Departmental request metrics & supervisor workload reports
├── controllers/           # HTTP request/response handling and status formatting
├── routes/                # Modular Express routers mounted under /api/v1
├── docs/                  # OpenAPI 3.0 specification (JSON and YAML)
└── types/                 # Shared domain types, response envelopes, and Express extensions
```

---

## 3. Database Schema Ownership (Coordination with Database Agent)

Database schema resides in [`packages/database/prisma/schema.prisma`](file:///c:/Users/RUDRANIL%20MONDAL/Documents/Web%20developement/Projects/7th%20Sem/Project6/packages/database/prisma/schema.prisma):
- `User`: Accounts with roles (`STUDENT`, `FACULTY`, `HOD`, `DEPARTMENT_ADMIN`) and status.
- `Department`: Department entity with code and name.
- `StudentProfile`: UG/PG program classification, roll number, batch year, current semester, CGPA.
- `FacultyProfile`: Employee ID, designation, max project capacity, specialization.
- `DepartmentalRequest`: Request category, title, description, academic context (JSON), current status, and current stage.
- `RequestWorkflowHistory`: Immutable trail recording request decisions, actor, stage, previous and resulting status, comments, and rejection reasons.
- `ProjectProposal`: Proposals with supervisor, term, UG/PG eligibility, capacity, prerequisites, and status (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
- `ProjectPreference`: Ranked student preferences for proposals per academic term.
- `ProjectAllocation`: Assignments with proposal, student, term, status (`ACTIVE`, `REASSIGNED`, `CANCELLED`), cancellation reasons, and reassignment references.
- `Notification`: System notifications for workflow transitions and allocations.
- `AuditLog`: Append-only audit trail capturing actor, action, entity type, entity ID, before/after states, and IP address.

---

## 4. Workflow Engine & Approval State Machine

Requests undergo structured state transitions:

```
[ DRAFT ]
    │
    ▼ (submit)
[ UNDER_REVIEW ] ──(request-changes)──► [ CHANGES_REQUESTED ]
    │      ▲                                   │
    │      └─────────────────(resubmit)────────┘
    ├──(reject)──────────► [ REJECTED ]
    │
    ├──(approve stage)───► [ UNDER_REVIEW (Next Stage) ]
    │
    └──(final approval)──► [ APPROVED ]
```

### Stage Configuration by Category
- **Course Registration**: `FACULTY_REVIEW` ➔ `HOD_REVIEW` ➔ `FINAL_DECISION`
- **Bonafide Certificate**: `HOD_REVIEW` ➔ `FINAL_DECISION`
- **Leave of Absence**: `FACULTY_REVIEW` ➔ `HOD_REVIEW`
- **Lab Access**: `FACULTY_REVIEW` ➔ `HOD_REVIEW`
- **Project Approval**: `FACULTY_REVIEW` ➔ `HOD_REVIEW` ➔ `FINAL_DECISION`
- **Special Permission**: `FACULTY_REVIEW` ➔ `HOD_REVIEW` ➔ `FINAL_DECISION`

### Validation & Security Rules
- A regular faculty member **cannot** approve an `HOD_REVIEW` stage.
- Rejection **requires** a descriptive `rejectionReason`.
- Requesting changes **requires** explanatory comments.
- Students can only submit and edit their own requests (IDOR prevented).

---

## 5. Project Allocation & Concurrency Protection

The `allocationService` executes inside a PostgreSQL **Serializable** transaction:
1. Validates that the proposal is in `PUBLISHED` status.
2. Verifies student program compatibility (`UG`, `PG`, or `BOTH`).
3. Prevents duplicate active allocations for the student within the same academic term.
4. Atomically checks active slots: if active assignments count $\ge$ proposal capacity, throws `409 CONFLICT`.
5. Records the allocating actor and creates an immutable audit trail entry.
6. Fires non-blocking asynchronous notifications to student and supervisor.

---

## 6. API Endpoints Contract (`/api/v1`)

### Standard Response Envelope

#### Success:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Error:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed for incoming request data.",
    "details": [ ... ]
  }
}
```

### Endpoint Summary

| Module | Method | Endpoint | Description | Allowed Roles |
|---|---|---|---|---|
| **Auth** | `POST` | `/auth/login` | Login and obtain JWT / HTTP-only cookie | Public |
| | `POST` | `/auth/logout` | Clear session cookie | Public |
| | `GET` | `/auth/me` | Current session user profile | Authenticated |
| **Students** | `GET` | `/students` | List student records (scoped by role) | Authenticated |
| | `GET` | `/students/:id` | Get student profile (IDOR protected) | Authenticated |
| | `POST` | `/students` | Create student account and profile | Admin, HOD |
| | `PATCH` | `/students/:id` | Update student profile | Admin, HOD |
| **Faculty** | `GET` | `/faculty` | List faculty members | Authenticated |
| | `GET` | `/faculty/:id` | Get faculty profile | Authenticated |
| | `POST` | `/faculty` | Create faculty account | Admin, HOD |
| | `PATCH` | `/faculty/:id` | Update faculty profile | Admin, HOD, Faculty |
| **Requests** | `GET` | `/requests` | List departmental requests | Authenticated |
| | `POST` | `/requests` | Create draft request | Authenticated |
| | `GET` | `/requests/:id` | Get request details (IDOR protected) | Authenticated |
| | `PATCH` | `/requests/:id` | Edit draft request | Requester, Admin |
| | `POST` | `/requests/:id/submit` | Submit draft into workflow | Requester, Admin |
| | `POST` | `/requests/:id/cancel` | Cancel request | Requester, Admin, HOD |
| | `POST` | `/requests/:id/resubmit` | Resubmit after revisions | Requester |
| | `GET` | `/requests/:id/history` | View immutable workflow history | Authenticated |
| **Approvals** | `GET` | `/approvals/pending` | List pending approvals for reviewer | Faculty, HOD, Admin |
| | `POST` | `/requests/:id/approve` | Approve current workflow stage | Faculty, HOD, Admin |
| | `POST` | `/requests/:id/reject` | Reject request (requires reason) | Faculty, HOD, Admin |
| | `POST` | `/requests/:id/request-changes` | Request revisions on request | Faculty, HOD, Admin |
| **Projects** | `GET` | `/projects` | List project proposals | Authenticated |
| | `POST` | `/projects` | Create proposal | Faculty, HOD, Admin |
| | `GET` | `/projects/:id` | Proposal details | Authenticated |
| | `PATCH` | `/projects/:id` | Update proposal | Supervisor, Admin, HOD |
| | `POST` | `/projects/:id/publish` | Publish proposal to students | Supervisor, Admin, HOD |
| | `POST` | `/projects/:id/archive` | Archive proposal | Supervisor, Admin, HOD |
| | `POST` | `/projects/preferences` | Submit ranked preferences | Student |
| | `GET` | `/projects/preferences/me` | View my preferences for term | Student |
| | `GET` | `/projects/:id/applications` | View student applications | Supervisor, HOD, Admin |
| **Allocations** | `GET` | `/allocations` | List allocations | Authenticated |
| | `POST` | `/allocations` | Concurrency-safe allocation | Admin, HOD |
| | `PATCH` | `/allocations/:id` | Reassign allocation | Admin, HOD |
| | `POST` | `/allocations/:id/cancel` | Cancel allocation | Admin, HOD |
| **Notifications** | `GET` | `/notifications` | List user notifications | Authenticated |
| | `PATCH` | `/notifications/:id/read` | Mark notification as read | Authenticated |
| | `PATCH` | `/notifications/read-all` | Mark all notifications read | Authenticated |
| **Reports** | `GET` | `/reports/requests` | Request metrics & stage breakdown | Faculty, HOD, Admin |
| | `GET` | `/reports/allocations` | Capacity utilization & workload | Faculty, HOD, Admin |
| **Docs** | `GET` | `/api/v1/docs` | Interactive Swagger UI documentation | Public |
| | `GET` | `/api/v1/docs.json` | Raw OpenAPI 3.0 specification | Public |

---

## 7. Setup & Execution Instructions

### Prerequisites
- Node.js $\ge$ 20
- Docker Desktop or PostgreSQL 16 running on port 5432

### 1. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` is configured:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/department_management?schema=public
```

### 2. Start PostgreSQL via Docker (if not running natively)
```bash
docker run -d --name project6-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=department_management -p 5432:5432 postgres:16-alpine
```

### 3. Push Database Schema & Seed Data
```bash
# Push schema to PostgreSQL database
npm run db:push

# Seed with standard roles, departments, profiles, and sample proposals
npm run db:seed
```

### 4. Run the API Server
```bash
# Development mode with hot-reloading
npm run dev

# Or compile and run production bundle
npm run build
npm start
```
The server will start at `http://localhost:4000`. Interactive documentation is available at `http://localhost:4000/api/v1/docs`.

### 5. Run Automated Tests
```bash
# Execute unit and integration test suite
npm test
```

---

## 8. Seeded Accounts for Testing & Evaluation

| Role | Email | Password | Description |
|---|---|---|---|
| **DEPARTMENT_ADMIN** | `admin.cse@university.edu` | `Password@123` | Department Administrator |
| **HOD** | `hod.cse@university.edu` | `Password@123` | Head of Department (Dr. Rajesh Mukherjee) |
| **FACULTY** | `prof.sharma@university.edu` | `Password@123` | Associate Professor (Dr. Vikram Sharma) |
| **FACULTY** | `dr.patel@university.edu` | `Password@123` | Assistant Professor (Dr. Sneha Patel) |
| **STUDENT (UG)** | `student.rahul@university.edu` | `Password@123` | B.Tech Semester 7 (Rahul Verma) |
| **STUDENT (PG)** | `student.ananya@university.edu` | `Password@123` | M.Tech Semester 3 (Ananya Roy) |
| **STUDENT (UG)** | `student.amit@university.edu` | `Password@123` | B.Tech Semester 7 (Amit Sen) |
