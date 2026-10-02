'use client';

import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from './button';
import { Modal } from './modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  extra?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'primary',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
  extra,
}: ConfirmDialogProps) {
  const confirmVariant: ButtonVariant = tone === 'danger' ? 'destructive' : 'primary';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      centered
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} isLoading={loading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {extra}
    </Modal>
  );
}