import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { allocationsApi, CreateAllocationPayload } from '../../api/allocations.api';
import { projectsApi } from '../../api/projects.api';
import { ProjectAllocation, AllocationStatus, ProjectProposal } from '../../types';
import { getApiErrorMessage } from '../../api/client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Textarea';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { AllocateModal } from '../../components/projects/AllocateModal';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import {
  FolderGit2,
  UserPlus,
  RefreshCw,
  Ban,
} from 'lucide-react';

export const ProjectAllocationsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [termFilter, setTermFilter] = useState('2026-AUTUMN');

  // Modals
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<ProjectAllocation | null>(null);

  // Form states for reassign / cancel
  const [reassignNewProposalId, setReassignNewProposalId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const canManage = hasRole('HOD', 'DEPARTMENT_ADMIN');

  const fetchAllocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allocsRes, propsRes] = await Promise.all([
        allocationsApi.list({
          status: statusFilter ? (statusFilter as AllocationStatus) : undefined,
          academicTerm: termFilter || undefined,
          limit: 100,
        }),
        projectsApi.list({ status: 'PUBLISHED', limit: 100 }),
      ]);

      setAllocations(allocsRes.items || []);
      setProposals(propsRes.items || []);
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, termFilter, toastError]);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleCreateAllocation = async (data: CreateAllocationPayload) => {
    setIsProcessing(true);
    try {
      await allocationsApi.create(data);
      success('Student allocated to project proposal successfully.');
      fetchAllocations();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Allocation Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedAllocation || !reassignNewProposalId || !reassignReason) return;
    setIsProcessing(true);
    try {
      await allocationsApi.reassign(selectedAllocation.id, {
        newProposalId: reassignNewProposalId,
        reason: reassignReason,
      });
      success('Allocation reassigned successfully to new project proposal.');
      setReassignModalOpen(false);
      setSelectedAllocation(null);
      setReassignReason('');
      fetchAllocations();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Reassignment Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAllocation || !cancellationReason) return;
    setIsProcessing(true);
    try {
      await allocationsApi.cancel(selectedAllocation.id, {
        cancellationReason,
      });
      success('Allocation has been cancelled.');
      setCancelModalOpen(false);
      setSelectedAllocation(null);
      setCancellationReason('');
      fetchAllocations();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Cancellation Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active Allocations' },
    { value: 'REASSIGNED', label: 'Reassigned' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const proposalOptions = proposals.map((p) => ({
    value: p.id,
    label: `${p.title} (${p.supervisor?.firstName} ${p.supervisor?.lastName})`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Project Allocation Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer transactional student-to-project allocations with capacity validation.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={() => setAllocateModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Allocate Student
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full flex items-center gap-3">
          <Input
            placeholder="Academic Term (e.g. 2026-AUTUMN)"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Allocation Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : allocations.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="w-10 h-10 text-slate-400" />}
          title="No Allocations Found"
          description="There are no project allocations matching your term and status filters."
          actionLabel={canManage ? 'Create First Allocation' : undefined}
          onAction={canManage ? () => setAllocateModalOpen(true) : undefined}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Proposal</TableHead>
              <TableHead>Allocated Student</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Academic Term</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Allocated Date</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((alloc) => (
              <TableRow key={alloc.id}>
                <TableCell>
                  <p className="font-semibold text-slate-800 line-clamp-1">{alloc.proposal?.title}</p>
                  <p className="text-[11px] text-slate-400">
                    Eligibility: {alloc.proposal?.ugPgEligibility} • Cap: {alloc.proposal?.capacity}
                  </p>
                </TableCell>

                <TableCell>
                  <p className="font-semibold text-slate-800">
                    {alloc.student?.firstName} {alloc.student?.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {alloc.student?.studentProfile?.rollNumber || alloc.student?.email} (
                    {alloc.student?.studentProfile?.program || 'UG'})
                  </p>
                </TableCell>

                <TableCell className="text-xs text-slate-700 font-medium">
                  {alloc.proposal?.supervisor?.firstName} {alloc.proposal?.supervisor?.lastName}
                </TableCell>

                <TableCell className="text-xs text-slate-600">{alloc.academicTerm}</TableCell>

                <TableCell>
                  <Badge
                    variant={
                      alloc.status === 'ACTIVE'
                        ? 'success'
                        : alloc.status === 'REASSIGNED'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {alloc.status}
                  </Badge>
                  {alloc.cancellationReason && (
                    <p className="text-[10px] text-rose-600 mt-1 line-clamp-1">
                      Reason: {alloc.cancellationReason}
                    </p>
                  )}
                </TableCell>

                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(alloc.allocatedAt).toLocaleDateString()}
                </TableCell>

                {canManage && (
                  <TableCell className="text-right whitespace-nowrap">
                    {alloc.status === 'ACTIVE' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAllocation(alloc);
                            setReassignModalOpen(true);
                          }}
                          leftIcon={<RefreshCw className="w-3 h-3" />}
                        >
                          Reassign
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setSelectedAllocation(alloc);
                            setCancelModalOpen(true);
                          }}
                          leftIcon={<Ban className="w-3 h-3" />}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Allocate Modal */}
      <AllocateModal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        onAllocate={handleCreateAllocation}
        isLoading={isProcessing}
      />

      {/* Reassign Modal */}
      {selectedAllocation && (
        <Modal
          isOpen={reassignModalOpen}
          onClose={() => setReassignModalOpen(false)}
          title="Reassign Project Allocation"
          description={`Reassign student "${selectedAllocation.student?.firstName} ${selectedAllocation.student?.lastName}" to a different research project proposal.`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <Select
              label="Target Project Proposal"
              options={proposalOptions}
              placeholder="Select new proposal..."
              value={reassignNewProposalId}
              onChange={(e) => setReassignNewProposalId(e.target.value)}
              required
            />

            <Textarea
              label="Reassignment Reason (Required)"
              placeholder="Provide justification for reassignment (e.g. supervisor conflict, research focus change)..."
              rows={3}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setReassignModalOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReassign}
                disabled={!reassignNewProposalId || !reassignReason}
                isLoading={isProcessing}
              >
                Confirm Reassignment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Allocation Modal */}
      {selectedAllocation && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Project Allocation"
          description={`Revoke the project assignment for student "${selectedAllocation.student?.firstName} ${selectedAllocation.student?.lastName}".`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <Textarea
              label="Cancellation Reason (Required, min 5 chars)"
              placeholder="Explain why this project allocation is being officially revoked..."
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              required
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
                disabled={isProcessing}
              >
                Close
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={cancellationReason.trim().length < 5}
                isLoading={isProcessing}
              >
                Confirm Revocation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
