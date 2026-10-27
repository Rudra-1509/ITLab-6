import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { DepartmentalRequest } from '../../types';
import { ResubmitRequestPayload } from '../../api/requests.api';

const resubmitSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10),
  comments: z.string().trim().min(3, 'Explanation of changes made is required for resubmission'),
});

type FormValues = z.infer<typeof resubmitSchema>;

interface ResubmitRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestItem: DepartmentalRequest;
  onResubmit: (data: ResubmitRequestPayload) => Promise<void>;
  isLoading?: boolean;
}

export const ResubmitRequestModal: React.FC<ResubmitRequestModalProps> = ({
  isOpen,
  onClose,
  requestItem,
  onResubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resubmitSchema),
    defaultValues: {
      title: requestItem.title,
      description: requestItem.description,
      comments: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await onResubmit({
      title: values.title,
      description: values.description,
      comments: values.comments,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resubmit Request with Changes"
      description="Address reviewer feedback and resubmit your request back into the approval workflow."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Title"
          error={errors.title?.message}
          required
          {...register('title')}
        />

        <Textarea
          label="Updated Description"
          rows={3}
          error={errors.description?.message}
          required
          {...register('description')}
        />

        <Textarea
          label="Explanation of Changes Made (Required)"
          placeholder="State clearly how you addressed reviewer comments or what changes were made..."
          rows={3}
          error={errors.comments?.message}
          required
          {...register('comments')}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Resubmit for Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};
