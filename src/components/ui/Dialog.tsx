'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  /** Esc, or the dialog closing for any other reason. */
  onClose: () => void;
  title: string;
  children?: ReactNode;
  /** Buttons along the bottom, side by side. */
  actions?: ReactNode;
};

/**
 * A modal over the ink scrim: white card, radius 32, raised shadow. The native <dialog> traps focus. Esc only asks
 * `onClose`: `open` decides, so a parent that refuses while busy keeps the dialog up.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Every render, not only when `open` changes: the browser may still force a close (a second Esc with no click
  // in between can't be cancelled), and the next render puts the dialog back if `open` says so.
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  });

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-28px)] max-w-sm rounded-dialog bg-white px-5 pt-6.5 pb-5 text-ink shadow-raised backdrop:bg-ink/42 backdrop:backdrop-blur-xs"
    >
      <h2 id={titleId} className="text-center font-display text-h3">{title}</h2>
      {children ? <div className="mt-3.5">{children}</div> : null}
      {actions ? <div className="mt-5 flex gap-2.5 *:flex-1">{actions}</div> : null}
    </dialog>
  );
}
