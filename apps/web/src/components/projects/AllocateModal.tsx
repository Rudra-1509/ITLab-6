import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { ProjectProposal, User } from '../../types';
import { studentsApi } from '../../api/students.api';
import { projectsApi } from '../../api/projects.api';

const allocateSchema = z.object({
  proposalId: z.string().uuid('Please select a proposal'),
  studentId: z.string().uuid('Please select a student'),
  academicTerm: z.string().trim().min(3, 'Academic term is required'),
});

type FormValues = z.infer<typeof allocateSchema>;

interface AllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllocate: (data: { proposalId: string; studentId: string; academicTerm: string }) => Promise<void>;
  defaultProposalId?: string;
  isLoading?: boolean;
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  onClose,
  onAllocate,
  defaultProposalId,
  isLoading = false,
}) => {
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(allocateSchema),
    defaultValues: {
      proposalId: defaultProposalId || '',
      studentId: '',
      academicTerm: '2026-AUTUMN',
    },
  });

  const selectedProposalId = watch('proposalId');
  const selectedProposal = proposals.find((p) => p.id === selectedProposalId);

  useEffect(() => {
    if (isOpen) {
      projectsApi
        .list({ status: 'PUBLISHED', limit: 100 })
        .then((res) => setProposals(res.items))
        .catch(() => {});

      studentsApi
        .list({ limit: 100 })
        .then((res) => setStudents(res.items))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultProposalId) {
      reset({
        proposalId: defaultProposalId,
        studentId: '',
        academicTerm: '2026-AUTUMN',
      });
    }
  }, [defaultProposalId, reset]);

  const onSubmit = async (values: FormValues) => {
    await onAllocate(values);
    reset();
    onClose();
  };

  const proposalOptions = proposals.map((p) => {
    const allocated = p._count?.allocations ?? p.allocations?.length ?? 0;
    return {
      value: p.id,
      label: `${p.title} (${allocated}/${p.capacity} allocated)`,
      disabled: allocated >= p.capacity,
    };
  });

  const studentOptions = students.map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName} (${s.studentProfile?.rollNumber || s.email}) - ${s.studentProfile?.program || 'UG'}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Allocate Student to Project"
      description="Assign a student to a research project proposal enforcing supervisory capacity limits."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Project Proposal"
          options={proposalOptions}
          placeholder="Select a project proposal..."
          error={errors.proposalId?.message}
          required
          {...register('proposalId')}
        />

        {selectedProposal && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <p className="text-slate-700">
              <span className="font-semibold">Supervisor:</span>{' '}
              {selectedProposal.supervisor?.firstName} {selectedProposal.supervisor?.lastName}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">Eligibility:</span>{' '}
              {selectedProposal.ugPgEligibility === 'BOTH' ? 'UG & PG' : selectedProposal.ugPgEligibility}
            </p>
            <p className="text-slate-700">
              <span className="font-semibold">Total Capacity:</span> {selectedProposal.capacity} students
            </p>
          </div>
        )}

        <Select
          label="Student Candidate"
          options={studentOptions}
          placeholder="Select an eligible student..."
          error={errors.studentId?.message}
          required
          {...register('studentId')}
        />

        <Input
          label="Academic Term"
          placeholder="e.g. 2026-AUTUMN"
          error={errors.academicTerm?.message}
          required
          {...register('academicTerm')}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Confirm Allocation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
