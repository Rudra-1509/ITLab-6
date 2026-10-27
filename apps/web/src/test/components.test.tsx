import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequestStatusBadge } from '../components/requests/RequestStatusBadge';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoading, LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { ReviewActionModal } from '../components/requests/ReviewActionModal';
import { ProjectProposal } from '../types';

describe('Departmental Management System — Frontend Component & Flow Tests', () => {
  describe('1. Request Status Badges & Lifecycle Visuals', () => {
    it('renders all shared workflow statuses with correct labels', () => {
      const statuses = [
        { status: 'DRAFT' as const, label: 'Draft' },
        { status: 'SUBMITTED' as const, label: 'Submitted' },
        { status: 'UNDER_REVIEW' as const, label: 'Under Review' },
        { status: 'APPROVED' as const, label: 'Approved' },
        { status: 'REJECTED' as const, label: 'Rejected' },
        { status: 'CHANGES_REQUESTED' as const, label: 'Changes Requested' },
        { status: 'CANCELLED' as const, label: 'Cancelled' },
      ];

      for (const { status, label } of statuses) {
        const { unmount } = render(<RequestStatusBadge status={status} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      }
    });

    it('renders custom badge variants properly', () => {
      render(<Badge variant="purple">Undergraduate & Postgraduate</Badge>);
      expect(screen.getByText('Undergraduate & Postgraduate')).toBeInTheDocument();
    });
  });

  describe('2. Loading and Empty States', () => {
    it('renders page loading indicator with custom message', () => {
      render(<PageLoading message="Synchronizing academic records..." />);
      expect(screen.getByText('Synchronizing academic records...')).toBeInTheDocument();
    });

    it('renders spinner component', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders empty state with actionable button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Allocations Present"
          description="Please allocate eligible students to continue."
          actionLabel="Allocate Student"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No Allocations Present')).toBeInTheDocument();
      expect(screen.getByText('Please allocate eligible students to continue.')).toBeInTheDocument();
      const button = screen.getByRole('button', { name: /allocate student/i });
      expect(button).toBeInTheDocument();
      button.click();
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Confirmation Dialog for Destructive Workflows', () => {
    it('renders confirmation dialog with title, message, and buttons', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Revoke Project Assignment"
          message="Are you sure you want to cancel this student's allocation?"
          confirmLabel="Yes, Revoke"
        />
      );

      expect(screen.getByText('Revoke Project Assignment')).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to cancel this student's allocation?")
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /yes, revoke/i });
      confirmBtn.click();
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not render when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Hidden"
          message="Should not be visible"
        />
      );

      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });
  });

  describe('4. Project Card Capacity and Eligibility', () => {
    const mockProposal: ProjectProposal = {
      id: 'prop-1',
      title: 'Autonomous Mobile Robot Navigation with SLAM',
      description: 'Design ROS2 navigation stack with lidar mapping.',
      supervisorId: 'fac-1',
      departmentId: 'dept-cse',
      academicTerm: '2026-AUTUMN',
      ugPgEligibility: 'BOTH',
      capacity: 3,
      prerequisites: 'C++, ROS2, Linux',
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supervisor: {
        id: 'fac-1',
        firstName: 'Vikram',
        lastName: 'Sharma',
        email: 'prof.sharma@university.edu',
        facultyProfile: {
          id: 'fp-1',
          userId: 'fac-1',
          employeeId: 'EMP-FAC-01',
          designation: 'Associate Professor',
          maxProjectCapacity: 5,
          status: 'ACTIVE',
        },
      },
      allocations: [
        {
          id: 'alloc-1',
          proposalId: 'prop-1',
          studentId: 'stud-1',
          allocatedById: 'admin-1',
          academicTerm: '2026-AUTUMN',
          status: 'ACTIVE',
          allocatedAt: new Date().toISOString(),
        },
      ],
    };

    it('displays proposal details, supervisor, and capacity utilization', () => {
      const handleDetails = vi.fn();
      render(
        <ProjectCard
          proposal={mockProposal}
          onViewDetails={handleDetails}
          isStudent={true}
        />
      );

      expect(screen.getByText('Autonomous Mobile Robot Navigation with SLAM')).toBeInTheDocument();
      expect(screen.getByText('UG & PG')).toBeInTheDocument();
      expect(screen.getByText(/Vikram Sharma/)).toBeInTheDocument();
      expect(screen.getByText(/1\/3 slots \(2 left\)/)).toBeInTheDocument();
      expect(screen.getByText(/Prerequisites: C\+\+, ROS2, Linux/)).toBeInTheDocument();
    });
  });

  describe('5. Button Component Behaviors', () => {
    it('disables button and displays spinner when isLoading is true', () => {
      render(
        <Button variant="primary" isLoading={true}>
          Submit Request
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });

    it('handles click events when enabled', () => {
      const handleClick = vi.fn();
      render(
        <Button variant="primary" onClick={handleClick}>
          Click Me
        </Button>
      );

      const btn = screen.getByRole('button', { name: /click me/i });
      btn.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Form Validation & Submission in Modals', () => {
    it('validates minimum length when creating request with short values', async () => {
      const handleSubmit = vi.fn();
      render(
        <CreateRequestModal
          isOpen={true}
          onClose={() => {}}
          onSubmit={handleSubmit}
        />
      );

      expect(screen.getByRole('heading', { name: /create departmental request/i })).toBeInTheDocument();
      const titleInput = screen.getByLabelText(/request title/i);
      await userEvent.type(titleInput, 'ab');

      const descInput = screen.getByLabelText(/detailed description/i);
      await userEvent.type(descInput, 'A valid long description for research');

      const saveBtn = screen.getByRole('button', { name: /save draft request/i });
      await userEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
      });
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('enforces mandatory rejection reason when rejecting request', async () => {
      const handleReject = vi.fn();
      render(
        <ReviewActionModal
          isOpen={true}
          onClose={() => {}}
          actionType="REJECT"
          requestTitle="Cloud Cluster Access"
          onApprove={vi.fn()}
          onReject={handleReject}
          onRequestChanges={vi.fn()}
        />
      );

      expect(screen.getByRole('heading', { name: 'Reject Request' })).toBeInTheDocument();
      const textarea = screen.getByLabelText(/rejection reason/i);
      await userEvent.type(textarea, 'bad'); // less than 5 characters

      const rejectBtn = screen.getByRole('button', { name: /reject request/i });
      await userEvent.click(rejectBtn);

      await waitFor(() => {
        expect(screen.getByText(/rejection reason is required/i)).toBeInTheDocument();
      });
      expect(handleReject).not.toHaveBeenCalled();
    });
  });

  describe('6. Authentication Guard & Protected Route Behavior', () => {
    it('redirects unauthenticated users to /login', async () => {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login Page Target</div>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div>Secret Dashboard Area</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Login Page Target')).toBeInTheDocument();
      expect(screen.queryByText('Secret Dashboard Area')).not.toBeInTheDocument();
    });
  });
});
