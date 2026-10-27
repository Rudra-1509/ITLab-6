import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { projectsApi, CreateProposalPayload } from '../../api/projects.api';
import { ProjectProposal, ProposalEligibility, ProposalStatus } from '../../types';
import { getApiErrorMessage } from '../../api/client';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { CreateProposalModal } from '../../components/projects/CreateProposalModal';
import { ProjectPreferenceModal } from '../../components/projects/ProjectPreferenceModal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { BookOpen, PlusCircle, Search, ListOrdered, CheckCircle2 } from 'lucide-react';

export const ProjectsCataloguePage: React.FC = () => {
  const { user, isStudent, hasRole } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [preferenceModalOpen, setPreferenceModalOpen] = useState(false);
  const [selectedForPreference, setSelectedForPreference] = useState<ProjectProposal[]>([]);

  const canCreateProposal = hasRole('FACULTY', 'HOD', 'DEPARTMENT_ADMIN');

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await projectsApi.list({
        status: statusFilter ? (statusFilter as ProposalStatus) : undefined,
        ugPgEligibility: eligibilityFilter ? (eligibilityFilter as ProposalEligibility) : undefined,
        academicTerm: termFilter || undefined,
        limit: 50,
      });
      setProposals(res.items || []);
    } catch (err) {
      toastError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, eligibilityFilter, termFilter, toastError]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleCreateProposal = async (payload: CreateProposalPayload) => {
    setIsSubmitting(true);
    try {
      await projectsApi.create(payload);
      success('Research project proposal drafted successfully.');
      fetchProposals();
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (proposal: ProjectProposal) => {
    try {
      await projectsApi.publish(proposal.id);
      success(`Proposal "${proposal.title}" is now published for student preference submission.`);
      fetchProposals();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const handleArchive = async (proposal: ProjectProposal) => {
    try {
      await projectsApi.archive(proposal.id);
      success(`Proposal "${proposal.title}" has been archived.`);
      fetchProposals();
    } catch (err) {
      toastError(getApiErrorMessage(err));
    }
  };

  const handleTogglePreference = (proposal: ProjectProposal) => {
    if (selectedForPreference.some((p) => p.id === proposal.id)) {
      setSelectedForPreference((prev) => prev.filter((p) => p.id !== proposal.id));
    } else {
      setSelectedForPreference((prev) => [...prev, proposal]);
    }
  };

  const handleSubmitPreferences = async (payload: {
    preferences: { proposalId: string; rank: number }[];
    academicTerm: string;
  }) => {
    setIsSubmitting(true);
    try {
      await projectsApi.submitPreferences(payload);
      success('Your ranked project preferences have been submitted successfully.');
      setSelectedForPreference([]);
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Failed to submit preferences');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProposals = proposals.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.supervisor?.firstName && `${p.supervisor.firstName} ${p.supervisor.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const eligibilityOptions = [
    { value: '', label: 'All Eligibility (UG/PG)' },
    { value: 'UG', label: 'Undergraduate (UG Only)' },
    { value: 'PG', label: 'Postgraduate (PG Only)' },
    { value: 'BOTH', label: 'Both UG & PG' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PUBLISHED', label: 'Published Only' },
    { value: 'DRAFT', label: 'Drafts Only' },
    { value: 'ARCHIVED', label: 'Archived Only' },
  ];

  if (isLoading) {
    return <PageLoading message="Loading project proposals catalogue..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Research & Capstone Projects</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse published project topics, faculty supervisors, capacity, and submit student preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isStudent && selectedForPreference.length > 0 && (
            <Button
              variant="primary"
              onClick={() => setPreferenceModalOpen(true)}
              leftIcon={<ListOrdered className="w-4 h-4" />}
            >
              Review Preferences ({selectedForPreference.length})
            </Button>
          )}

          {canCreateProposal && (
            <Button
              variant="primary"
              onClick={() => setCreateModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              New Proposal
            </Button>
          )}
        </div>
      </div>

      {/* Filter and search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search proposals by title, topic, or supervisor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            options={eligibilityOptions}
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
          />
          {!isStudent && (
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          )}
          <Input
            placeholder="Term (e.g. 2026-AUTUMN)"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      {/* Grid of Projects */}
      {filteredProposals.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-slate-400" />}
          title="No Proposals Found"
          description={
            searchQuery || eligibilityFilter || termFilter || statusFilter
              ? 'No project proposals match your search or filter settings.'
              : 'There are currently no proposals in the catalogue.'
          }
          actionLabel={canCreateProposal ? 'Create First Proposal' : undefined}
          onAction={canCreateProposal ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProposals.map((proposal) => (
            <ProjectCard
              key={proposal.id}
              proposal={proposal}
              onViewDetails={(p) => navigate(`/projects/${p.id}`)}
              onSelectPreference={handleTogglePreference}
              onPublish={handlePublish}
              onArchive={handleArchive}
              isStudent={isStudent}
              isOwnerOrStaff={canCreateProposal && (proposal.supervisorId === user?.id || hasRole('HOD', 'DEPARTMENT_ADMIN'))}
              isSelected={selectedForPreference.some((p) => p.id === proposal.id)}
            />
          ))}
        </div>
      )}

      {/* Floating Preference Tray for Students */}
      {isStudent && selectedForPreference.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {selectedForPreference.length} project{selectedForPreference.length > 1 ? 's' : ''} in preference basket
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setPreferenceModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 rounded-full text-xs font-semibold"
          >
            Rank & Submit Preferences
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreateProposalModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateProposal}
        isLoading={isSubmitting}
      />

      <ProjectPreferenceModal
        isOpen={preferenceModalOpen}
        onClose={() => setPreferenceModalOpen(false)}
        selectedProposals={selectedForPreference}
        onRemoveProposal={(id) => setSelectedForPreference((prev) => prev.filter((p) => p.id !== id))}
        onReorder={(items) => setSelectedForPreference(items)}
        onSubmitPreferences={handleSubmitPreferences}
        isLoading={isSubmitting}
      />
    </div>
  );
};
