import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { approvalsApi } from '../../api/approvals.api';
import { requestsApi } from '../../api/requests.api';
import { DepartmentalRequest } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../api/client';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ReviewActionModal, ReviewActionType } from '../../components/requests/ReviewActionModal';
import { EmptyState } from '../../components/common/EmptyState';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Clock,
  User,
  Calendar,
} from 'lucide-react';

export const ApprovalWorkspacePage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [requests, setRequests] = useState<DepartmentalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected request for action
  const [activeRequest, setActiveRequest] = useState<DepartmentalRequest | null>(null);
  const [actionType, setActionType] = useState<ReviewActionType>('APPROVE');
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await approvalsApi.getPending();
      setRequests(data);
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleOpenAction = (request: DepartmentalRequest, type: ReviewActionType) => {
    setActiveRequest(request);
    setActionType(type);
    setModalOpen(true);
  };

  const handleApprove = async (data: { comments?: string }) => {
    if (!activeRequest) return;
    setIsProcessing(true);
    try {
      await requestsApi.approve(activeRequest.id, data);
      success(`Request "${activeRequest.title}" approved successfully.`);
      fetchPending();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (data: { rejectionReason: string; comments?: string }) => {
    if (!activeRequest) return;
    setIsProcessing(true);
    try {
      await requestsApi.reject(activeRequest.id, data);
      success(`Request "${activeRequest.title}" rejected with reason.`);
      fetchPending();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async (data: { comments: string }) => {
    if (!activeRequest) return;
    setIsProcessing(true);
    try {
      await requestsApi.requestChanges(activeRequest.id, data);
      success(`Revision comments sent for "${activeRequest.title}".`);
      fetchPending();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.requester?.firstName && `${r.requester.firstName} ${r.requester.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'COURSE_REGISTRATION', label: 'Course Registration' },
    { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate' },
    { value: 'LEAVE_OF_ABSENCE', label: 'Leave of Absence' },
    { value: 'LAB_ACCESS', label: 'Laboratory Access' },
    { value: 'PROJECT_APPROVAL', label: 'Project Approval' },
    { value: 'SPECIAL_PERMISSION', label: 'Special Permission' },
  ];

  if (isLoading) {
    return <PageLoading message="Loading pending approval queue..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Review & Approval Workspace</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Process student academic requests assigned to your faculty stage or escalated to HOD authority.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title, student name, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Queue items */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-10 h-10 text-emerald-500" />}
          title="Review Queue Clear"
          description={
            requests.length === 0
              ? 'Great job! There are no departmental requests currently awaiting your approval.'
              : 'No requests match your current search filters.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <Card key={req.id} className="hover:border-slate-300 transition">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {req.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Stage: {req.currentStage ? req.currentStage.replace(/_/g, ' ') : 'Under Review'}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase ${
                          req.priority === 'URGENT' ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        Priority: {req.priority}
                      </span>
                    </div>

                    <Link
                      to={`/requests/${req.id}`}
                      className="text-base font-semibold text-slate-800 hover:text-indigo-600 transition block"
                    >
                      {req.title}
                    </Link>

                    <p className="text-xs text-slate-600 line-clamp-2">{req.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Student:{' '}
                        <span className="font-semibold text-slate-700">
                          {req.requester?.firstName} {req.requester?.lastName}
                        </span>{' '}
                        ({req.requester?.studentProfile?.rollNumber || req.requester?.email})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Submitted: {new Date(req.submittedAt || req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <Link to={`/requests/${req.id}`}>
                      <Button variant="ghost" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Details
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAction(req, 'REQUEST_CHANGES')}
                      disabled={isProcessing}
                      leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-purple-600" />}
                    >
                      Request Changes
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenAction(req, 'REJECT')}
                      disabled={isProcessing}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject
                    </Button>

                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleOpenAction(req, 'APPROVE')}
                      disabled={isProcessing}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Action Modal */}
      {activeRequest && (
        <ReviewActionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          actionType={actionType}
          requestTitle={activeRequest.title}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestChanges={handleRequestChanges}
          isLoading={isProcessing}
        />
      )}
    </div>
  );
};
