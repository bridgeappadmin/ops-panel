'use client';

import type { ReactNode } from 'react';
import { Button, Dialog } from '@/components/ui';

/**
 * A kit Dialog with a dismiss and a confirm button (replaces window.confirm/prompt). `onClose` fires for Esc, the
 * dismiss button and any programmatic close, so it must only close; the action belongs in `onConfirm`.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, dismissLabel = 'Cancel', danger = false, loading = false, onConfirm, onClose }: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  dismissLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button variant="tint" size="sm" disabled={loading} onClick={onClose}>{dismissLabel}</Button>
          <Button variant={danger ? 'danger' : 'secondary'} size="sm" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
