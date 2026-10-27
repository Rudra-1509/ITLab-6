import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { studentsApi, CreateStudentPayload } from '../../api/students.api';
import { User, StudentProgram, StudentStatus, PaginationMeta } from '../../types';
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
import { GraduationCap, UserPlus, Search, Edit } from 'lucide-react';

export const StudentsDirectoryPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  const [students, setStudents] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateStudentPayload>({
    email: '',
    password: 'Password@123',
    firstName: '',
    lastName: '',
    departmentId: user?.departmentId || '',
    rollNumber: '',
    program: 'UG',
    batchYear: 2026,
    currentSemester: 7,
    cgpa: 8.5,
  });

  const canEdit = hasRole('HOD', 'DEPARTMENT_ADMIN');

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await studentsApi.list({
        page,
        limit,
        program: programFilter ? (programFilter as StudentProgram) : undefined,
        status: statusFilter ? (statusFilter as StudentStatus) : undefined,
        search: searchQuery || undefined,
      });

      setStudents(res.items || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, programFilter, statusFilter, searchQuery, toastError]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await studentsApi.create({
        ...createForm,
        departmentId: user?.departmentId || 'CSE',
      });
      success(`Enrolled student ${createForm.firstName} ${createForm.lastName} successfully.`);
      setCreateModalOpen(false);
      fetchStudents();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Enrollment Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      await studentsApi.update(selectedStudent.id, {
        firstName: selectedStudent.firstName,
        lastName: selectedStudent.lastName,
        currentSemester: selectedStudent.studentProfile?.currentSemester,
        cgpa: selectedStudent.studentProfile?.cgpa ?? undefined,
        status: selectedStudent.studentProfile?.status,
      });
      success(`Updated profile for ${selectedStudent.firstName}.`);
      setEditModalOpen(false);
      fetchStudents();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const programOptions = [
    { value: '', label: 'All Programs' },
    { value: 'UG', label: 'Undergraduate (UG)' },
    { value: 'PG', label: 'Postgraduate (PG)' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'GRADUATED', label: 'Graduated' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Academic Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain undergraduate and postgraduate student records and academic standings.
          </p>
        </div>

        {canEdit && (
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Enroll Student
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by student name, roll number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            options={programOptions}
            value={programFilter}
            onChange={(e) => {
              setProgramFilter(e.target.value);
              setPage(1);
            }}
          />
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
      ) : students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-10 h-10 text-slate-400" />}
          title="No Students Found"
          description="There are no student profiles matching your search criteria."
          actionLabel={canEdit ? 'Enroll First Student' : undefined}
          onAction={canEdit ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-semibold text-slate-800">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400">{s.email}</p>
                  </TableCell>

                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {s.studentProfile?.rollNumber || 'N/A'}
                  </TableCell>

                  <TableCell>
                    <Badge variant={s.studentProfile?.program === 'UG' ? 'info' : 'purple'}>
                      {s.studentProfile?.program || 'UG'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">{s.studentProfile?.batchYear}</TableCell>
                  <TableCell className="text-xs text-slate-600">Sem {s.studentProfile?.currentSemester}</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">
                    {s.studentProfile?.cgpa ? s.studentProfile.cgpa.toFixed(2) : '—'}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        s.studentProfile?.status === 'ACTIVE'
                          ? 'success'
                          : s.studentProfile?.status === 'GRADUATED'
                          ? 'primary'
                          : 'danger'
                      }
                    >
                      {s.studentProfile?.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>

                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(s);
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

      {/* Enroll Student Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Enroll New Student"
        description="Create a student user account and academic profile in the department."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
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
              placeholder="e.g. student.new@university.edu"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <Input
              label="Roll Number"
              required
              placeholder="e.g. UG2024CSE105"
              value={createForm.rollNumber}
              onChange={(e) => setCreateForm({ ...createForm, rollNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Program"
              options={[
                { value: 'UG', label: 'Undergraduate (UG)' },
                { value: 'PG', label: 'Postgraduate (PG)' },
              ]}
              value={createForm.program}
              onChange={(e) => setCreateForm({ ...createForm, program: e.target.value as StudentProgram })}
            />
            <Input
              label="Batch Year"
              type="number"
              required
              value={createForm.batchYear}
              onChange={(e) => setCreateForm({ ...createForm, batchYear: Number(e.target.value) })}
            />
            <Input
              label="Current Semester"
              type="number"
              min={1}
              max={12}
              required
              value={createForm.currentSemester}
              onChange={(e) => setCreateForm({ ...createForm, currentSemester: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Enroll Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      {selectedStudent && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Student Profile"
          description={`Update academic records for ${selectedStudent.firstName} ${selectedStudent.lastName}.`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={selectedStudent.firstName}
                onChange={(e) => setSelectedStudent({ ...selectedStudent, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={selectedStudent.lastName}
                onChange={(e) => setSelectedStudent({ ...selectedStudent, lastName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Current Semester"
                type="number"
                min={1}
                max={12}
                value={selectedStudent.studentProfile?.currentSemester || 1}
                onChange={(e) =>
                  setSelectedStudent({
                    ...selectedStudent,
                    studentProfile: {
                      ...selectedStudent.studentProfile!,
                      currentSemester: Number(e.target.value),
                    },
                  })
                }
              />
              <Input
                label="CGPA"
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={selectedStudent.studentProfile?.cgpa ?? 8.0}
                onChange={(e) =>
                  setSelectedStudent({
                    ...selectedStudent,
                    studentProfile: {
                      ...selectedStudent.studentProfile!,
                      cgpa: Number(e.target.value),
                    },
                  })
                }
              />
            </div>

            <Select
              label="Student Status"
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'GRADUATED', label: 'Graduated' },
              ]}
              value={selectedStudent.studentProfile?.status || 'ACTIVE'}
              onChange={(e) =>
                setSelectedStudent({
                  ...selectedStudent,
                  studentProfile: {
                    ...selectedStudent.studentProfile!,
                    status: e.target.value as StudentStatus,
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
