'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Callers commonly pass an inline onClose callback. Keep the latest
  // callback without making the focus-trap effect re-run on every parent
  // render (for example, on every keystroke in a controlled input).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // Do not steal focus from a field when the dialog is already open. The
    // initial focus is handled once, while subsequent controlled renders
    // preserve the user's active input.
    if (!dialogRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="presentation">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Modal Container */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="civique-dialog-title"
        aria-describedby={description ? 'civique-dialog-description' : undefined}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white p-6 md:p-8 text-[#0f172a] shadow-2xl outline-none animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id="civique-dialog-title" className="text-xl font-bold tracking-tight text-[#0f172a]">
              {title}
            </h2>
            {description && (
              <p id="civique-dialog-description" className="text-sm text-[#64748b] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
