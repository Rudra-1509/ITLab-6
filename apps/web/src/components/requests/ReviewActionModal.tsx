import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../common/Modal';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export type ReviewActionType = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

const approveSchema = z.object({
  comments: z.string().trim().max(1000).optional(),
});

const rejectSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, 'Rejection reason is required (minimum 5 characters)')
    .max(1000),
  comments: z.string().trim().max(1000).optional(),
});

const requestChangesSchema = z.object({
  comments: z
    .string()
    .trim()
    .min(5, 'Specific changes required must be detailed (minimum 5 characters)')
    .max(1000),
});

interface FormValues {
  comments?: string;
  rejectionReason?: string;
}

interface ReviewActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ReviewActionType;
  requestTitle: string;
  onApprove: (data: { comments?: string }) => Promise<void>;
  onReject: (data: { rejectionReason: string; comments?: string }) => Promise<void>;
  onRequestChanges: (data: { comments: string }) => Promise<void>;
  isLoading?: boolean;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  requestTitle,
  onApprove,
  onReject,
  onRequestChanges,
  isLoading = false,
}) => {
  const currentSchema =
    actionType === 'APPROVE'
      ? approveSchema
      : actionType === 'REJECT'
      ? rejectSchema
      : requestChangesSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
  });

  const onSubmit = async (data: FormValues) => {
    if (actionType === 'APPROVE') {
      await onApprove({ comments: data.comments });
    } else if (actionType === 'REJECT') {
      await onReject({ rejectionReason: data.rejectionReason || '', comments: data.comments });
    } else if (actionType === 'REQUEST_CHANGES') {
      await onRequestChanges({ comments: data.comments || '' });
    }
    reset();
    onClose();
  };

  const titles: Record<ReviewActionType, { title: string; desc: string; icon: React.ReactNode }> = {
    APPROVE: {
      title: 'Approve Request Stage',
      desc: `You are approving this stage for "${requestTitle}". It will advance to the next workflow stage or be finalized.`,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    },
    REJECT: {
      title: 'Reject Request',
      desc: `You are rejecting "${requestTitle}". Please specify an official academic rejection reason.`,
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
    },
    REQUEST_CHANGES: {
      title: 'Request Changes',
      desc: `Send "${requestTitle}" back to the requester for clarification or updated documents.`,
      icon: <AlertTriangle className="w-5 h-5 text-purple-600" />,
    },
  };

  const info = titles[actionType];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={info.title}
      description={info.desc}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {actionType === 'REJECT' && (
          <Textarea
            label="Rejection Reason (Required)"
            placeholder="Specify reason for denial, missing prerequisites, or institutional policy..."
            rows={3}
            error={errors.rejectionReason?.message}
            required
            {...register('rejectionReason')}
          />
        )}

        {actionType === 'REQUEST_CHANGES' && (
          <Textarea
            label="Requested Changes & Feedback (Required)"
            placeholder="Explain specifically what details or documents the student must provide before resubmission..."
            rows={3}
            error={errors.comments?.message}
            required
            {...register('comments')}
          />
        )}

        {actionType === 'APPROVE' && (
          <Textarea
            label="Approval Comments (Optional)"
            placeholder="Add any guidance, conditions, or instructions for the student..."
            rows={3}
            error={errors.comments?.message}
            {...register('comments')}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={
              actionType === 'APPROVE'
                ? 'success'
                : actionType === 'REJECT'
                ? 'danger'
                : 'primary'
            }
            isLoading={isLoading}
          >
            {actionType === 'APPROVE'
              ? 'Confirm Approval'
              : actionType === 'REJECT'
              ? 'Reject Request'
              : 'Send Change Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
