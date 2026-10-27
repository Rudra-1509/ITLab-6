import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { requestsApi, ResubmitRequestPayload } from '../../api/requests.api';
import { DepartmentalRequest, RequestWorkflowHistory } from '../../types';
import { getApiErrorMessage } from '../../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RequestStatusBadge } from '../../components/requests/RequestStatusBadge';
import { WorkflowTimeline } from '../../components/requests/WorkflowTimeline';
import { ReviewActionModal, ReviewActionType } from '../../components/requests/ReviewActionModal';
import { ResubmitRequestModal } from '../../components/requests/ResubmitRequestModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Send,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  User,
  Calendar,
  Layers,
  Flag,
} from 'lucide-react';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  const [request, setRequest] = useState<DepartmentalRequest | null>(null);
  const [history, setHistory] = useState<RequestWorkflowHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewActionType>('APPROVE');
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [reqData, histData] = await Promise.all([
        requestsApi.getById(id),
        requestsApi.getHistory(id),
      ]);
      setRequest(reqData);
      setHistory(histData);
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  if (isLoading || !request) {
    return <PageLoading message="Loading request details and approval history..." />;
  }

  const isRequester = user?.id === request.requesterId;
  const canReview =
    hasRole('FACULTY', 'HOD', 'DEPARTMENT_ADMIN') && request.currentStatus === 'UNDER_REVIEW';

  // Handlers
  const handleSubmitRequest = async () => {
    setIsProcessing(true);
    try {
      await requestsApi.submit(request.id);
      success('Request submitted into the departmental approval workflow.');
      setConfirmSubmitOpen(false);
      fetchRequestDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsProcessing(true);
    try {
      await requestsApi.cancel(request.id);
      success('Request has been cancelled.');
      setConfirmCancelOpen(false);
      fetchRequestDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResubmitRequest = async (payload: ResubmitRequestPayload) => {
    setIsProcessing(true);
    try {
      await requestsApi.resubmit(request.id, payload);
      success('Request resubmitted successfully for review.');
      fetchRequestDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (data: { comments?: string }) => {
    setIsProcessing(true);
    try {
      await requestsApi.approve(request.id, data);
      success('Stage approved successfully.');
      fetchRequestDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (data: { rejectionReason: string; comments?: string }) => {
    setIsProcessing(true);
    try {
      await requestsApi.reject(request.id, data);
      success('Request has been rejected with comments.');
      fetchRequestDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async (data: { comments: string }) => {
    setIsProcessing(true);
    try {
      await requestsApi.requestChanges(request.id, data);
      success('Request sent back to student for revisions.');
      fetchRequestDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewModal = (type: ReviewActionType) => {
    setReviewAction(type);
    setReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top back button and action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Requester Submit Draft */}
          {isRequester && request.currentStatus === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={isProcessing}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Submit for Review
            </Button>
          )}

          {/* Requester Resubmit Changes */}
          {isRequester && request.currentStatus === 'CHANGES_REQUESTED' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setResubmitModalOpen(true)}
              disabled={isProcessing}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Resubmit Request
            </Button>
          )}

          {/* Requester Cancel */}
          {isRequester && ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(request.currentStatus) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={isProcessing}
              leftIcon={<Ban className="w-4 h-4 text-rose-500" />}
            >
              Cancel Request
            </Button>
          )}

          {/* Reviewer Actions */}
          {canReview && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => openReviewModal('APPROVE')}
                disabled={isProcessing}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Approve Stage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReviewModal('REQUEST_CHANGES')}
                disabled={isProcessing}
                leftIcon={<AlertTriangle className="w-4 h-4 text-purple-600" />}
              >
                Request Changes
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => openReviewModal('REJECT')}
                disabled={isProcessing}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Request Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Description */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                    {request.category.replace(/_/g, ' ')}
                  </span>
                  <RequestStatusBadge status={request.currentStatus} />
                </div>
                <CardTitle className="text-lg font-bold">{request.title}</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Request Rationale & Description
                </h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {request.description}
                </div>
              </div>

              {/* Academic Context JSON metadata display */}
              {request.academicContext && Object.keys(request.academicContext).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Academic Context Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(request.academicContext).map(([k, v]) => (
                      <div key={k} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                        <span className="font-semibold text-slate-600 capitalize">
                          {k.replace(/([A-Z])/g, ' $1')}:{' '}
                        </span>
                        <span className="text-slate-800 font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workflow Stepper & Decision History */}
              <WorkflowTimeline
                currentStage={request.currentStage}
                currentStatus={request.currentStatus}
                history={history}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Metadata & Requester info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'N/A'}
                  </p>
                  <p className="text-slate-400">{request.requester?.email}</p>
                  {request.requester?.studentProfile?.rollNumber && (
                    <p className="text-indigo-600 font-medium mt-0.5">
                      Roll No: {request.requester.studentProfile.rollNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Flag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-medium">Priority Level</p>
                  <p className="font-semibold text-slate-800 uppercase mt-0.5">{request.priority}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Layers className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-medium">Current Workflow Stage</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {request.currentStage ? request.currentStage.replace(/_/g, ' ') : 'Not in active review'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-medium">Created On</p>
                  <p className="text-slate-700 mt-0.5">
                    {new Date(request.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation and Action Dialogs */}
      <ConfirmDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={handleSubmitRequest}
        title="Submit Request into Approval Workflow"
        message="Are you ready to submit this request? It will transition to Under Review at the first workflow stage."
        confirmLabel="Submit Request"
        variant="primary"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancelRequest}
        title="Cancel Request Confirmation"
        message="Are you sure you want to cancel this request? This action will mark it as Cancelled."
        confirmLabel="Cancel Request"
        variant="danger"
        isLoading={isProcessing}
      />

      <ReviewActionModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        actionType={reviewAction}
        requestTitle={request.title}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestChanges={handleRequestChanges}
        isLoading={isProcessing}
      />

      <ResubmitRequestModal
        isOpen={resubmitModalOpen}
        onClose={() => setResubmitModalOpen(false)}
        requestItem={request}
        onResubmit={handleResubmitRequest}
        isLoading={isProcessing}
      />
    </div>
  );
};
