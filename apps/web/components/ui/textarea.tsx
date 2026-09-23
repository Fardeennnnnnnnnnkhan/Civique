import React, { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, label, id, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          className={`flex w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-sm text-[#0f172a] shadow-2xs placeholder:text-[#94a3b8] transition-all focus:outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/25' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-[#ef4444]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
