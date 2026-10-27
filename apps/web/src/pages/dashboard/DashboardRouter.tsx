import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { StudentDashboard } from './StudentDashboard';
import { FacultyDashboard } from './FacultyDashboard';
import { HodDashboard } from './HodDashboard';
import { AdminDashboard } from './AdminDashboard';
import { PageLoading } from '../../components/common/LoadingSpinner';

export const DashboardRouter: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <PageLoading message="Authenticating session..." />;
  }

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard />;
    case 'FACULTY':
      return <FacultyDashboard />;
    case 'HOD':
      return <HodDashboard />;
    case 'DEPARTMENT_ADMIN':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
};
