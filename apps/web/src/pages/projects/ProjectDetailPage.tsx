import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { projectsApi, CreateProposalPayload } from '../../api/projects.api';
import { allocationsApi } from '../../api/allocations.api';
import { ProjectProposal, ProjectPreference, ProjectAllocation } from '../../types';
import { getApiErrorMessage } from '../../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/common/Table';
import { CreateProposalModal } from '../../components/projects/CreateProposalModal';
import { AllocateModal } from '../../components/projects/AllocateModal';
import { PageLoading } from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Users,
  Award,
  Calendar,
  Edit,
  UserPlus,
  CheckCircle2,
  Archive,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  const [proposal, setProposal] = useState<ProjectProposal | null>(null);
  const [applications, setApplications] = useState<ProjectPreference[]>([]);
  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = hasRole('FACULTY', 'HOD', 'DEPARTMENT_ADMIN');
  const isHodOrAdmin = hasRole('HOD', 'DEPARTMENT_ADMIN');

  const fetchProjectDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const propData = await projectsApi.getById(id);
      setProposal(propData);

      // If staff, fetch student applications & allocations
      if (canManage) {
        const [appsData, allocsData] = await Promise.all([
          projectsApi.getApplications(id).catch(() => []),
          allocationsApi.list({ proposalId: id, status: 'ACTIVE' }).then((r) => r.items || []).catch(() => []),
        ]);
        setApplications(appsData);
        setAllocations(allocsData);
      }
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id, canManage, toastError]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  if (isLoading || !proposal) {
    return <PageLoading message="Loading project proposal specifications..." />;
  }

  const isOwner = proposal.supervisorId === user?.id;
  const isFull = allocations.length >= proposal.capacity;

  const handleUpdateProposal = async (payload: CreateProposalPayload) => {
    setIsSubmitting(true);
    try {
      await projectsApi.update(proposal.id, payload);
      success('Project proposal updated successfully.');
      fetchProjectDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    try {
      await projectsApi.publish(proposal.id);
      success('Proposal published successfully.');
      fetchProjectDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const handleArchive = async () => {
    try {
      await projectsApi.archive(proposal.id);
      success('Proposal archived.');
      fetchProjectDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const handleDirectAllocate = async (data: { proposalId: string; studentId: string; academicTerm: string }) => {
    setIsSubmitting(true);
    try {
      await allocationsApi.create(data);
      success('Student allocated to project proposal successfully.');
      fetchProjectDetails();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Project Catalogue
        </button>

        <div className="flex items-center gap-2">
          {(isOwner || isHodOrAdmin) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              leftIcon={<Edit className="w-3.5 h-3.5" />}
            >
              Edit Proposal
            </Button>
          )}

          {(isOwner || isHodOrAdmin) && proposal.status === 'DRAFT' && (
            <Button
              variant="success"
              size="sm"
              onClick={handlePublish}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Publish Proposal
            </Button>
          )}

          {(isOwner || isHodOrAdmin) && proposal.status === 'PUBLISHED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              leftIcon={<Archive className="w-3.5 h-3.5 text-slate-400" />}
            >
              Archive
            </Button>
          )}

          {isHodOrAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAllocateModalOpen(true)}
              disabled={isFull}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              {isFull ? 'Capacity Reached' : 'Allocate Student'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Proposal Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Scope & Description */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={
                      proposal.ugPgEligibility === 'BOTH'
                        ? 'purple'
                        : proposal.ugPgEligibility === 'UG'
                        ? 'info'
                        : 'primary'
                    }
                  >
                    {proposal.ugPgEligibility === 'BOTH' ? 'UG & PG' : `${proposal.ugPgEligibility} Only`}
                  </Badge>
                  <Badge
                    variant={
                      proposal.status === 'PUBLISHED'
                        ? 'success'
                        : proposal.status === 'DRAFT'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {proposal.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold">{proposal.title}</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Project Description & Research Scope
                </h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {proposal.description}
                </div>
              </div>

              {proposal.prerequisites && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Prerequisites & Required Technical Competencies
                  </h4>
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-950">
                    {proposal.prerequisites}
                  </div>
                </div>
              )}

              {/* Active Allocated Students */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Allocated Supervisees ({allocations.length}/{proposal.capacity})
                  </h4>
                </div>
                {allocations.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No students have been allocated to this project proposal yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {allocations.map((alloc) => (
                      <div key={alloc.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {alloc.student?.firstName} {alloc.student?.lastName}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            {alloc.student?.studentProfile?.rollNumber} • {alloc.student?.studentProfile?.program}
                          </p>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active Allocation
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Applicants / Preferences (Staff only) */}
              {canManage && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Student Preference Submissions ({applications.length})
                  </h4>
                  {applications.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      No student preference submissions recorded for this proposal yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Program & Roll No</TableHead>
                          <TableHead>Student Rank</TableHead>
                          <TableHead>Submitted On</TableHead>
                          {isHodOrAdmin && <TableHead className="text-right">Action</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-semibold text-slate-800">
                              {app.student?.firstName} {app.student?.lastName}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {app.student?.studentProfile?.program || 'UG'} • {app.student?.studentProfile?.rollNumber || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Rank #{app.rank}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </TableCell>
                            {isHodOrAdmin && (
                              <TableCell className="text-right">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isFull}
                                  onClick={() =>
                                    handleDirectAllocate({
                                      proposalId: proposal.id,
                                      studentId: app.studentId,
                                      academicTerm: proposal.academicTerm,
                                    })
                                  }
                                >
                                  Allocate
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Metadata & Supervisor specs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <Award className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {proposal.supervisor ? `${proposal.supervisor.firstName} ${proposal.supervisor.lastName}` : 'Faculty Member'}
                  </p>
                  <p className="text-slate-400">{proposal.supervisor?.email}</p>
                  {proposal.supervisor?.facultyProfile?.designation && (
                    <p className="text-indigo-600 font-medium mt-0.5">
                      {proposal.supervisor.facultyProfile.designation}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-medium">Capacity Limits</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {allocations.length} of {proposal.capacity} slots allocated ({Math.max(proposal.capacity - allocations.length, 0)} available)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-medium">Academic Term</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.academicTerm}</p>
                </div>
              </div>

              {proposal.applicationDeadline && (
                <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-400 font-medium">Application Deadline</p>
                    <p className="font-semibold text-rose-600 mt-0.5">
                      {new Date(proposal.applicationDeadline).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Proposal Modal */}
      <CreateProposalModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        proposalToEdit={proposal}
        onSubmit={handleUpdateProposal}
        isLoading={isSubmitting}
      />

      {/* Allocate Modal */}
      <AllocateModal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        defaultProposalId={proposal.id}
        onAllocate={handleDirectAllocate}
        isLoading={isSubmitting}
      />
    </div>
  );
};
