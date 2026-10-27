import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { facultyApi, CreateFacultyPayload } from '../../api/faculty.api';
import { User, FacultyStatus, PaginationMeta } from '../../types';
import { getApiErrorMessage } from '../../api/client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Users, UserPlus, Search, Edit } from 'lucide-react';

export const FacultyDirectoryPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  const [faculty, setFaculty] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [createForm, setCreateForm] = useState<CreateFacultyPayload>({
    email: '',
    password: 'Password@123',
    firstName: '',
    lastName: '',
    departmentId: user?.departmentId || '',
    employeeId: '',
    designation: 'Assistant Professor',
    maxProjectCapacity: 5,
    specialization: 'Artificial Intelligence',
  });

  const canEdit = hasRole('HOD', 'DEPARTMENT_ADMIN');

  const fetchFaculty = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await facultyApi.list({
        page,
        limit,
        status: statusFilter ? (statusFilter as FacultyStatus) : undefined,
        search: searchQuery || undefined,
      });

      setFaculty(res.items || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, searchQuery, toastError]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await facultyApi.create({
        ...createForm,
        departmentId: user?.departmentId || 'CSE',
      });
      success(`Added faculty member Prof. ${createForm.firstName} ${createForm.lastName}.`);
      setCreateModalOpen(false);
      fetchFaculty();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Registration Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    setIsSubmitting(true);
    try {
      await facultyApi.update(selectedFaculty.id, {
        firstName: selectedFaculty.firstName,
        lastName: selectedFaculty.lastName,
        designation: selectedFaculty.facultyProfile?.designation,
        maxProjectCapacity: selectedFaculty.facultyProfile?.maxProjectCapacity,
        specialization: selectedFaculty.facultyProfile?.specialization || undefined,
        status: selectedFaculty.facultyProfile?.status,
      });
      success(`Updated faculty record for ${selectedFaculty.firstName}.`);
      setEditModalOpen(false);
      fetchFaculty();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ON_LEAVE', label: 'On Leave' },
    { value: 'RETIRED', label: 'Retired' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Faculty Academic Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Department instructors, project supervisors, and committee review members.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Faculty Member
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by faculty name, designation, or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="w-full sm:w-64">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : faculty.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10 text-slate-400" />}
          title="No Faculty Members Found"
          description="There are no faculty members matching your filter criteria."
          actionLabel={canEdit ? 'Add Faculty Member' : undefined}
          onAction={canEdit ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Project Capacity</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {faculty.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-800">
                      {f.firstName} {f.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400">{f.email}</p>
                  </TableCell>

                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {f.facultyProfile?.employeeId || 'N/A'}
                  </TableCell>

                  <TableCell className="text-xs text-slate-700 font-medium">
                    {f.facultyProfile?.designation || 'Faculty'}
                  </TableCell>

                  <TableCell className="text-xs text-slate-500">
                    {f.facultyProfile?.specialization || 'General CSE'}
                  </TableCell>

                  <TableCell className="text-xs font-semibold text-indigo-700">
                    {f.facultyProfile?.maxProjectCapacity || 5} students max
                  </TableCell>

                  <TableCell>
                    <Badge variant={f.facultyProfile?.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {f.facultyProfile?.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>

                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFaculty(f);
                          setEditModalOpen(true);
                        }}
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Add Faculty Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Faculty Member"
        description="Register a new faculty instructor and supervisor in the department."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateFaculty} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={createForm.firstName}
              onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              value={createForm.lastName}
              onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="University Email"
              type="email"
              required
              placeholder="e.g. dr.faculty@university.edu"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <Input
              label="Employee ID"
              required
              placeholder="e.g. EMP-FAC-09"
              value={createForm.employeeId}
              onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Designation"
              required
              value={createForm.designation}
              onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
            />
            <Input
              label="Max Capacity"
              type="number"
              min={1}
              max={20}
              required
              value={createForm.maxProjectCapacity}
              onChange={(e) => setCreateForm({ ...createForm, maxProjectCapacity: Number(e.target.value) })}
            />
            <Input
              label="Specialization"
              value={createForm.specialization || ''}
              onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add Faculty Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Faculty Modal */}
      {selectedFaculty && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Faculty Record"
          description={`Update details for ${selectedFaculty.firstName} ${selectedFaculty.lastName}.`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateFaculty} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={selectedFaculty.firstName}
                onChange={(e) => setSelectedFaculty({ ...selectedFaculty, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={selectedFaculty.lastName}
                onChange={(e) => setSelectedFaculty({ ...selectedFaculty, lastName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Designation"
                value={selectedFaculty.facultyProfile?.designation || ''}
                onChange={(e) =>
                  setSelectedFaculty({
                    ...selectedFaculty,
                    facultyProfile: {
                      ...selectedFaculty.facultyProfile!,
                      designation: e.target.value,
                    },
                  })
                }
                required
              />
              <Input
                label="Max Project Capacity"
                type="number"
                min={0}
                max={20}
                value={selectedFaculty.facultyProfile?.maxProjectCapacity || 5}
                onChange={(e) =>
                  setSelectedFaculty({
                    ...selectedFaculty,
                    facultyProfile: {
                      ...selectedFaculty.facultyProfile!,
                      maxProjectCapacity: Number(e.target.value),
                    },
                  })
                }
                required
              />
            </div>

            <Input
              label="Specialization"
              value={selectedFaculty.facultyProfile?.specialization || ''}
              onChange={(e) =>
                setSelectedFaculty({
                  ...selectedFaculty,
                  facultyProfile: {
                    ...selectedFaculty.facultyProfile!,
                    specialization: e.target.value,
                  },
                })
              }
            />

            <Select
              label="Status"
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ON_LEAVE', label: 'On Leave' },
                { value: 'RETIRED', label: 'Retired' },
              ]}
              value={selectedFaculty.facultyProfile?.status || 'ACTIVE'}
              onChange={(e) =>
                setSelectedFaculty({
                  ...selectedFaculty,
                  facultyProfile: {
                    ...selectedFaculty.facultyProfile!,
                    status: e.target.value as FacultyStatus,
                  },
                })
              }
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
