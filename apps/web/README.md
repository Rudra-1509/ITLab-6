# Departmental Management System — Frontend Application (`apps/web`)

A modern, university-grade Single Page Application (SPA) designed for academic departmental administration, managing UG/PG students, faculty, multi-stage approval workflows, project proposals, transactional allocations, and workload analytics.

---

## 1. Technology Stack

- **Runtime & Framework**: React 18 with Vite and TypeScript (Strict Mode)
- **Styling & UI**: Tailwind CSS with custom academic administrative theme
- **Routing**: React Router DOM (v6) with declarative role-based guards (`ProtectedRoute`)
- **Server State & Data Fetching**: TanStack Query (React Query v5)
- **Form Management & Validation**: React Hook Form with Zod schemas
- **Icons**: Lucide React
- **Data Visualizations**: Recharts (bar charts and status breakdown charts)
- **HTTP Client**: Axios with credentials (`withCredentials: true`), JWT bearer fallback, and error parsing
- **Testing**: Vitest + React Testing Library + jsdom

---

## 2. Directory Structure

```
apps/web/
├── index.html                  # HTML entry point with Inter typography
├── package.json                # Dependencies and npm scripts
├── tsconfig.json               # TypeScript configuration with path aliases
├── vite.config.ts              # Vite config, dev proxy to :4000, and Vitest setup
├── tailwind.config.ts          # Tailwind CSS design system theme
├── postcss.config.js           # PostCSS plugins
├── .env.example                # Template for environment variables
├── .env                        # Local development environment configuration
├── src/
│   ├── main.tsx                # React DOM bootstrap
│   ├── App.tsx                 # Root providers (QueryClient, Router, Auth, Toast)
│   ├── index.css               # Tailwind directives and custom scrollbars
│   ├── vite-env.d.ts           # Vite client environment types
│   ├── types/
│   │   └── index.ts            # Complete domain types (User, Request, Proposal, Allocation, etc.)
│   ├── api/
│   │   ├── client.ts           # Centralized Axios client with error handling & interceptors
│   │   ├── auth.api.ts         # Login, logout, session restoration (/auth/me)
│   │   ├── requests.api.ts     # Request lifecycle (create, submit, cancel, resubmit, approve, reject)
│   │   ├── approvals.api.ts    # Reviewer pending queue (/approvals/pending)
│   │   ├── projects.api.ts     # Proposals CRUD, publish, archive, preferences
│   │   ├── allocations.api.ts  # Allocation CRUD, reassign, cancel
│   │   ├── students.api.ts     # Student directory and profiles
│   │   ├── faculty.api.ts      # Faculty directory and profiles
│   │   ├── notifications.api.ts# Notifications list, mark as read
│   │   └── reports.api.ts      # Request metrics and workload analytics
│   ├── context/
│   │   ├── AuthContext.tsx     # Authentication state, session restore, role helpers
│   │   └── ToastContext.tsx    # Accessible toast notifications (success, error, warning, info)
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.tsx       # Semantic badges for statuses and eligibility
│   │   │   ├── Button.tsx      # Accessible button with loading spinner & variants
│   │   │   ├── Input.tsx       # Text input with labels, icons, and error states
│   │   │   ├── Select.tsx      # Select dropdown with validation
│   │   │   ├── Textarea.tsx    # Multi-line text area
│   │   │   ├── Card.tsx        # Card compound containers
│   │   │   ├── Modal.tsx       # Accessible dialog with ESC close and backdrop blur
│   │   │   ├── ConfirmDialog.tsx# Confirmation dialog for destructive actions
│   │   │   ├── Table.tsx       # Accessible data table components
│   │   │   ├── Pagination.tsx  # Dynamic page controls and items-per-page
│   │   │   ├── EmptyState.tsx  # Polished empty state with action button
│   │   │   ├── LoadingSpinner.tsx# Skeletons and page loading spinner
│   │   │   └── StatCard.tsx    # Metric summary card
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx   # Shell container (Sidebar + Header + Breadcrumbs + Outlet)
│   │   │   ├── Sidebar.tsx     # Role-based navigation with live approval count badge
│   │   │   ├── Header.tsx      # Active user menu, role badge, notification popover
│   │   │   ├── NotificationDropdown.tsx# Notification drawer with mark read
│   │   │   └── Breadcrumbs.tsx # Dynamic breadcrumb navigation
│   │   ├── requests/
│   │   │   ├── RequestStatusBadge.tsx# Color-coded badges for workflow statuses
│   │   │   ├── WorkflowTimeline.tsx  # Multi-stage stepper & audit decision history
│   │   │   ├── CreateRequestModal.tsx# Form with Zod validation and faculty routing
│   │   │   ├── ReviewActionModal.tsx # Approve, Reject, or Request Changes modal
│   │   │   └── ResubmitRequestModal.tsx# Revision resubmission modal
│   │   └── projects/
│   │       ├── ProjectCard.tsx       # Proposal card with supervisor and capacity
│   │       ├── ProjectPreferenceModal.tsx# Ranked preference submission modal
│   │       ├── CreateProposalModal.tsx   # Proposal drafting and editing modal
│   │       └── AllocateModal.tsx     # Transactional student allocation modal
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx         # University login with quick-fill demo presets
│   │   │   ├── UnauthorizedPage.tsx  # 403 Forbidden screen
│   │   │   └── NotFoundPage.tsx      # 404 Route not found screen
│   │   ├── dashboard/
│   │   │   ├── DashboardRouter.tsx   # Dynamic router for role-specific dashboards
│   │   │   ├── StudentDashboard.tsx  # Student metrics, requests, project status
│   │   │   ├── FacultyDashboard.tsx  # Review queue, supervised proposals, capacity
│   │   │   ├── HodDashboard.tsx      # HOD queue, faculty workloads, allocations
│   │   │   └── AdminDashboard.tsx    # Student/faculty counts, administrative tools
│   │   ├── requests/
│   │   │   ├── RequestsListPage.tsx  # Searchable requests table with category filters
│   │   │   └── RequestDetailPage.tsx # Full request view, timeline, action toolbar
│   │   ├── approvals/
│   │   │   └── ApprovalWorkspacePage.tsx# Reviewer queue with fast decision triggers
│   │   ├── projects/
│   │   │   ├── ProjectsCataloguePage.tsx# Filterable proposals and preference tray
│   │   │   ├── ProjectDetailPage.tsx # Full proposal specs and applicants table
│   │   │   └── ProjectAllocationsPage.tsx# HOD/Admin allocation matrix
│   │   ├── directory/
│   │   │   ├── StudentsDirectoryPage.tsx# Searchable students table with enrollment modal
│   │   │   └── FacultyDirectoryPage.tsx # Searchable faculty table with add modal
│   │   ├── notifications/
│   │   │   └── NotificationsPage.tsx # Notification center with unread filter
│   │   ├── reports/
│   │   │   └── DepartmentReportsPage.tsx# Analytical charts and JSON export
│   │   └── profile/
│   │       └── ProfilePage.tsx       # User profile and academic credentials
│   ├── routes/
│   │   ├── AppRoutes.tsx             # Complete route hierarchy
│   │   └── ProtectedRoute.tsx        # Authentication & RBAC route guard
│   └── test/
│       ├── setup.ts                  # Vitest browser mocks
│       └── components.test.tsx       # Comprehensive unit and flow tests
```

---

## 3. Getting Started & Running

### Installation
From the root repository or inside `apps/web`:
```bash
# If in root directory:
npm run web:build

# Or navigate directly:
cd apps/web
npm install
```

### Development Server
```bash
# Starts Vite dev server on http://localhost:5173
npm run dev
# (or from repository root: npm run web:dev)
```

### Production Build & Type Checking
```bash
npm run build
# (or from repository root: npm run web:build)
```

### Running Test Suite
```bash
npm test
# (or from repository root: npm run web:test)
```

---

## 4. Demo Login Credentials (Seeded)

The login screen provides **Quick-Fill buttons** for rapid evaluation:

| Role | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- |
| **Student** | `student.rahul@university.edu` | `Password@123` | Submit requests, view status timeline, rank project preferences |
| **Faculty** | `prof.sharma@university.edu` | `Password@123` | Review queue, approve/reject/request changes, draft proposals |
| **HOD** | `hod.cse@university.edu` | `Password@123` | Escalated HOD queue, project allocation matrix, workload reports |
| **Dept Admin** | `admin.cse@university.edu` | `Password@123` | Student/faculty directories, enrollments, allocation administration |

---

## 5. API Integration Contract

The frontend connects to the backend at `/api/v1`:

### Authentication (`/auth`)
- `POST /auth/login` — Authenticates user, sets HTTP-only cookie, returns `{ token, user }`.
- `POST /auth/logout` — Clears session cookie and invalidates client session.
- `GET /auth/me` — Fetches current session user profile, department, and role data.

### Departmental Requests (`/requests`)
- `GET /requests` — Lists requests with query filters (`page`, `limit`, `category`, `status`, `search`).
- `POST /requests` — Creates draft request with category, title, description, priority, context.
- `GET /requests/:id` — Fetches individual request details.
- `PATCH /requests/:id` — Updates draft request.
- `GET /requests/:id/history` — Fetches immutable workflow audit trail and comments.
- `POST /requests/:id/submit` — Submits draft request into the approval state machine.
- `POST /requests/:id/cancel` — Cancels draft or pending request.
- `POST /requests/:id/resubmit` — Resubmits request with revised details and explanation.
- `POST /requests/:id/approve` — Reviewer approves current stage.
- `POST /requests/:id/reject` — Reviewer rejects request with mandatory reason.
- `POST /requests/:id/request-changes` — Reviewer sends back request with specific feedback.

### Approvals Queue (`/approvals`)
- `GET /approvals/pending` — Fetches pending approval queue for reviewer or HOD.

### Projects & Preferences (`/projects`)
- `GET /projects` — Lists published or draft proposals with filters (`status`, `ugPgEligibility`, `academicTerm`).
- `POST /projects` — Creates new project proposal.
- `GET /projects/:id` — Fetches proposal details and supervisor credentials.
- `PATCH /projects/:id` — Updates proposal specifications.
- `POST /projects/:id/publish` — Publishes proposal for student applications.
- `POST /projects/:id/archive` — Archives proposal.
- `GET /projects/:id/applications` — Lists student preference applications for proposal.
- `GET /projects/preferences/me` — Fetches current student's submitted preferences.
- `POST /projects/preferences` — Atomically submits student's ranked project preferences.

### Project Allocations (`/allocations`)
- `GET /allocations` — Lists allocations with query filters (`proposalId`, `studentId`, `academicTerm`, `status`).
- `POST /allocations` — Atomically allocates student to proposal with capacity validation.
- `PATCH /allocations/:id` — Reassigns allocation to another proposal with reason.
- `POST /allocations/:id/cancel` — Revokes allocation with cancellation reason.

### Academic Directories (`/students`, `/faculty`)
- `GET /students` & `POST /students` & `PATCH /students/:id` — Student records and profile management.
- `GET /faculty` & `POST /faculty` & `PATCH /faculty/:id` — Faculty records and supervisory limits.

### Notifications & Reports (`/notifications`, `/reports`)
- `GET /notifications` & `PATCH /notifications/:id/read` & `PATCH /notifications/read-all` — System notifications.
- `GET /reports/requests` — Request aggregation by category, status, and stage.
- `GET /reports/allocations` — Supervisory workloads and capacity utilization rates.
