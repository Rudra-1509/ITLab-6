import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { ProjectProposal, ProposalEligibility } from '../../types';
import { CreateProposalPayload } from '../../api/projects.api';

const proposalSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  academicTerm: z.string().trim().min(3, 'Academic term is required'),
  ugPgEligibility: z.enum(['UG', 'PG', 'BOTH']),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(20),
  prerequisites: z.string().optional(),
  applicationDeadline: z.string().optional(),
});

type FormValues = z.infer<typeof proposalSchema>;

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalToEdit?: ProjectProposal | null;
  onSubmit: (data: CreateProposalPayload) => Promise<void>;
  isLoading?: boolean;
}

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
  isOpen,
  onClose,
  proposalToEdit,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: '',
      description: '',
      academicTerm: '2026-AUTUMN',
      ugPgEligibility: 'BOTH',
      capacity: 2,
      prerequisites: '',
      applicationDeadline: '',
    },
  });

  useEffect(() => {
    if (proposalToEdit) {
      reset({
        title: proposalToEdit.title,
        description: proposalToEdit.description,
        academicTerm: proposalToEdit.academicTerm,
        ugPgEligibility: proposalToEdit.ugPgEligibility,
        capacity: proposalToEdit.capacity,
        prerequisites: proposalToEdit.prerequisites || '',
        applicationDeadline: proposalToEdit.applicationDeadline
          ? new Date(proposalToEdit.applicationDeadline).toISOString().slice(0, 10)
          : '',
      });
    } else {
      reset({
        title: '',
        description: '',
        academicTerm: '2026-AUTUMN',
        ugPgEligibility: 'BOTH',
        capacity: 2,
        prerequisites: '',
        applicationDeadline: '',
      });
    }
  }, [proposalToEdit, reset, isOpen]);

  const onFormSubmit = async (values: FormValues) => {
    await onSubmit({
      title: values.title,
      description: values.description,
      academicTerm: values.academicTerm,
      ugPgEligibility: values.ugPgEligibility as ProposalEligibility,
      capacity: values.capacity,
      prerequisites: values.prerequisites || undefined,
      applicationDeadline: values.applicationDeadline || undefined,
    });
    onClose();
  };

  const eligibilityOptions = [
    { value: 'BOTH', label: 'Undergraduate & Postgraduate (Both)' },
    { value: 'UG', label: 'Undergraduate (UG Only)' },
    { value: 'PG', label: 'Postgraduate (PG Only)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={proposalToEdit ? 'Edit Project Proposal' : 'Create New Project Proposal'}
      description="Define the research project, student eligibility, and supervisory capacity."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <Input
          label="Project Title"
          placeholder="e.g. Distributed Consensus in Asynchronous Byzantine Networks"
          error={errors.title?.message}
          required
          {...register('title')}
        />

        <Textarea
          label="Detailed Description & Objectives"
          placeholder="Describe research scope, methodologies, expected deliverables, and software stack..."
          rows={4}
          error={errors.description?.message}
          required
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Academic Term"
            placeholder="e.g. 2026-AUTUMN"
            error={errors.academicTerm?.message}
            required
            {...register('academicTerm')}
          />

          <Select
            label="Eligibility"
            options={eligibilityOptions}
            error={errors.ugPgEligibility?.message}
            required
            {...register('ugPgEligibility')}
          />

          <Input
            label="Capacity (Students)"
            type="number"
            min={1}
            max={20}
            error={errors.capacity?.message}
            required
            {...register('capacity')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prerequisites (Optional)"
            placeholder="e.g. Advanced Data Structures, PyTorch, C++"
            error={errors.prerequisites?.message}
            {...register('prerequisites')}
          />

          <Input
            label="Application Deadline (Optional)"
            type="date"
            error={errors.applicationDeadline?.message}
            {...register('applicationDeadline')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {proposalToEdit ? 'Save Changes' : 'Create Proposal (Draft)'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
