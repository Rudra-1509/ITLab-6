import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { requestsApi, CreateRequestPayload } from '../../api/requests.api';
import { DepartmentalRequest, RequestCategory, RequestStatus, PaginationMeta } from '../../types';
import { getApiErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { RequestStatusBadge } from '../../components/requests/RequestStatusBadge';
import { CreateRequestModal } from '../../components/requests/CreateRequestModal';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { PlusCircle, Search, Eye, FileText } from 'lucide-react';

export const RequestsListPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [requests, setRequests] = useState<DepartmentalRequest[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await requestsApi.list({
        page,
        limit,
        category: categoryFilter ? (categoryFilter as RequestCategory) : undefined,
        status: statusFilter ? (statusFilter as RequestStatus) : undefined,
        search: searchQuery || undefined,
      });

      setRequests(res.items || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, categoryFilter, statusFilter, searchQuery, toastError]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCreateRequest = async (payload: CreateRequestPayload) => {
    setIsSubmitting(true);
    try {
      await requestsApi.create(payload);
      success('Departmental request created successfully in Draft status.');
      fetchRequests();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'COURSE_REGISTRATION', label: 'Course Registration' },
    { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate' },
    { value: 'LEAVE_OF_ABSENCE', label: 'Leave of Absence' },
    { value: 'LAB_ACCESS', label: 'Laboratory Access' },
    { value: 'PROJECT_APPROVAL', label: 'Project Approval' },
    { value: 'SPECIAL_PERMISSION', label: 'Special Permission' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Departmental Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit, track, and manage official academic and departmental requests.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          New Request
        </Button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search request title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
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

      {/* Table Data */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-slate-400" />}
          title="No requests found"
          description={
            categoryFilter || statusFilter || searchQuery
              ? 'No requests match your current filters. Try resetting search or category filters.'
              : 'You have not submitted any departmental requests yet. Create your first request.'
          }
          actionLabel="Create Request"
          onAction={() => setIsCreateModalOpen(true)}
          actionIcon={<PlusCircle className="w-4 h-4" />}
        />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request Title</TableHead>
                <TableHead>Category</TableHead>
                {user?.role !== 'STUDENT' && <TableHead>Requester</TableHead>}
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Link
                      to={`/requests/${req.id}`}
                      className="font-semibold text-slate-800 hover:text-indigo-600 line-clamp-1"
                    >
                      {req.title}
                    </Link>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{req.description}</p>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200 whitespace-nowrap">
                      {req.category.replace(/_/g, ' ')}
                    </span>
                  </TableCell>

                  {user?.role !== 'STUDENT' && (
                    <TableCell>
                      <div className="text-xs text-slate-700 font-medium">
                        {req.requester ? `${req.requester.firstName} ${req.requester.lastName}` : 'N/A'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {req.requester?.studentProfile?.rollNumber || req.requester?.email}
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <span
                      className={`text-[11px] font-semibold uppercase ${
                        req.priority === 'URGENT'
                          ? 'text-rose-600'
                          : req.priority === 'HIGH'
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {req.priority}
                    </span>
                  </TableCell>

                  <TableCell>
                    <RequestStatusBadge status={req.currentStatus} />
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-600">
                      {req.currentStage ? req.currentStage.replace(/_/g, ' ') : '—'}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(req.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link to={`/requests/${req.id}`}>
                      <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                        View
                      </Button>
                    </Link>
                  </TableCell>
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

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRequest}
        isLoading={isSubmitting}
      />
    </div>
  );
};
