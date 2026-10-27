import React from 'react';
import { RequestStatus } from '../../types';
import { Badge, BadgeVariant } from '../common/Badge';
import {
  FileEdit,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
} from 'lucide-react';

interface RequestStatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({ status, className = '' }) => {
  const config: Record<
    RequestStatus,
    { label: string; variant: BadgeVariant; icon: React.ReactNode }
  > = {
    DRAFT: {
      label: 'Draft',
      variant: 'default',
      icon: <FileEdit className="w-3.5 h-3.5" />,
    },
    SUBMITTED: {
      label: 'Submitted',
      variant: 'info',
      icon: <Send className="w-3.5 h-3.5" />,
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      variant: 'warning',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    APPROVED: {
      label: 'Approved',
      variant: 'success',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
    REJECTED: {
      label: 'Rejected',
      variant: 'danger',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    CHANGES_REQUESTED: {
      label: 'Changes Requested',
      variant: 'purple',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    CANCELLED: {
      label: 'Cancelled',
      variant: 'neutral',
      icon: <Ban className="w-3.5 h-3.5" />,
    },
  };

  const current = config[status] || {
    label: status,
    variant: 'default',
    icon: null,
  };

  return (
    <Badge variant={current.variant} icon={current.icon} className={className}>
      {current.label}
    </Badge>
  );
};
