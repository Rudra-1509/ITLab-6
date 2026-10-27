import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`p-3 rounded-full ${
            variant === 'danger'
              ? 'bg-rose-100 text-rose-600'
              : variant === 'warning'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-indigo-100 text-indigo-600'
          }`}
        >
          {variant === 'danger' && <AlertCircle className="w-6 h-6" />}
          {variant === 'warning' && <AlertTriangle className="w-6 h-6" />}
          {variant === 'primary' && <Info className="w-6 h-6" />}
        </div>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex items-center justify-center gap-3 w-full pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
