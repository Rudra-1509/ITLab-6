import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { NotFoundPage } from '../pages/auth/NotFoundPage';
import { DashboardRouter } from '../pages/dashboard/DashboardRouter';
import { RequestsListPage } from '../pages/requests/RequestsListPage';
import { RequestDetailPage } from '../pages/requests/RequestDetailPage';
import { ApprovalWorkspacePage } from '../pages/approvals/ApprovalWorkspacePage';
import { ProjectsCataloguePage } from '../pages/projects/ProjectsCataloguePage';
import { ProjectDetailPage } from '../pages/projects/ProjectDetailPage';
import { ProjectAllocationsPage } from '../pages/projects/ProjectAllocationsPage';
import { StudentsDirectoryPage } from '../pages/directory/StudentsDirectoryPage';
import { FacultyDirectoryPage } from '../pages/directory/FacultyDirectoryPage';
import { DepartmentReportsPage } from '../pages/reports/DepartmentReportsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected routes wrapped in AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardRouter />} />

        {/* Department Requests */}
        <Route path="/requests" element={<RequestsListPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />

        {/* Review Workspace for Faculty, HOD, and Admin */}
        <Route
          path="/approvals"
          element={
            <ProtectedRoute allowedRoles={['FACULTY', 'HOD', 'DEPARTMENT_ADMIN']}>
              <ApprovalWorkspacePage />
            </ProtectedRoute>
          }
        />

        {/* Project Catalogue & Details */}
        <Route path="/projects" element={<ProjectsCataloguePage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        {/* Project Allocations for HOD and Admin */}
        <Route
          path="/allocations"
          element={
            <ProtectedRoute allowedRoles={['HOD', 'DEPARTMENT_ADMIN']}>
              <ProjectAllocationsPage />
            </ProtectedRoute>
          }
        />

        {/* Student Directory for HOD and Admin */}
        <Route
          path="/students"
          element={
            <ProtectedRoute allowedRoles={['HOD', 'DEPARTMENT_ADMIN']}>
              <StudentsDirectoryPage />
            </ProtectedRoute>
          }
        />

        {/* Faculty Directory for HOD and Admin */}
        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={['HOD', 'DEPARTMENT_ADMIN']}>
              <FacultyDirectoryPage />
            </ProtectedRoute>
          }
        />

        {/* Analytical Reports for Faculty, HOD, and Admin */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['FACULTY', 'HOD', 'DEPARTMENT_ADMIN']}>
              <DepartmentReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications & Profile */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
