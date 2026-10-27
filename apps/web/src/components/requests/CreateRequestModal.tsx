import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { RequestCategory, User } from '../../types';
import { CreateRequestPayload } from '../../api/requests.api';
import { facultyApi } from '../../api/faculty.api';

const createRequestSchema = z.object({
  category: z.enum([
    'COURSE_REGISTRATION',
    'BONAFIDE_CERTIFICATE',
    'LEAVE_OF_ABSENCE',
    'LAB_ACCESS',
    'PROJECT_APPROVAL',
    'SPECIAL_PERMISSION',
  ]),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  targetReviewerId: z.string().optional(),
  semester: z.string().optional(),
  additionalContext: z.string().optional(),
});

type FormValues = z.infer<typeof createRequestSchema>;

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRequestPayload) => Promise<void>;
  isLoading?: boolean;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [facultyList, setFacultyList] = useState<User[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      category: 'COURSE_REGISTRATION',
      priority: 'NORMAL',
      title: '',
      description: '',
      targetReviewerId: '',
      semester: '7',
      additionalContext: '',
    },
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    if (isOpen) {
      facultyApi
        .list({ limit: 50 })
        .then((res) => setFacultyList(res.items))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleFormSubmit = async (values: FormValues) => {
    const payload: CreateRequestPayload = {
      category: values.category as RequestCategory,
      title: values.title,
      description: values.description,
      priority: values.priority,
      targetReviewerId: values.targetReviewerId || undefined,
      academicContext: {
        semester: values.semester ? Number(values.semester) : undefined,
        note: values.additionalContext || undefined,
      },
    };

    await onSubmit(payload);
    reset();
    onClose();
  };

  const categoryOptions = [
    { value: 'COURSE_REGISTRATION', label: 'Course Registration' },
    { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate' },
    { value: 'LEAVE_OF_ABSENCE', label: 'Leave of Absence' },
    { value: 'LAB_ACCESS', label: 'Laboratory Access' },
    { value: 'PROJECT_APPROVAL', label: 'Project Approval' },
    { value: 'SPECIAL_PERMISSION', label: 'Special Permission' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low Priority' },
    { value: 'NORMAL', label: 'Normal Priority' },
    { value: 'HIGH', label: 'High Priority' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const facultyOptions = facultyList.map((f) => ({
    value: f.id,
    label: `${f.firstName} ${f.lastName} (${f.facultyProfile?.designation || 'Faculty'})`,
  }));

  const requiresFacultyReview = [
    'COURSE_REGISTRATION',
    'LAB_ACCESS',
    'PROJECT_APPROVAL',
    'SPECIAL_PERMISSION',
    'LEAVE_OF_ABSENCE',
  ].includes(selectedCategory);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Departmental Request"
      description="Submit a new academic or administrative request into the department workflow."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Request Category"
            options={categoryOptions}
            error={errors.category?.message}
            required
            {...register('category')}
          />
          <Select
            label="Priority"
            options={priorityOptions}
            error={errors.priority?.message}
            required
            {...register('priority')}
          />
        </div>

        <Input
          label="Request Title"
          placeholder="e.g. Request for Cloud Lab GPU Cluster Access"
          error={errors.title?.message}
          required
          {...register('title')}
        />

        <Textarea
          label="Detailed Description"
          placeholder="Provide clear rationale, specific academic needs, and relevant details..."
          rows={3}
          error={errors.description?.message}
          required
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Current Semester"
            type="number"
            min={1}
            max={12}
            placeholder="e.g. 7"
            error={errors.semester?.message}
            {...register('semester')}
          />

          {requiresFacultyReview ? (
            <Select
              label="Preferred Faculty Reviewer (Optional)"
              options={facultyOptions}
              placeholder="Select faculty member..."
              error={errors.targetReviewerId?.message}
              {...register('targetReviewerId')}
            />
          ) : (
            <Input
              label="Review Routing"
              disabled
              value="Direct to HOD / Department Admin"
            />
          )}
        </div>

        <Input
          label="Additional Academic Context"
          placeholder="e.g. Lab Name, Course Code, or External Organization"
          error={errors.additionalContext?.message}
          {...register('additionalContext')}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Draft Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
