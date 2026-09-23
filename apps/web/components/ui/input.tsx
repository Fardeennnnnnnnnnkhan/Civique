import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', error, label, id, endAdornment, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            type={type}
            ref={ref}
            className={`flex h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2 text-sm text-[#0f172a] shadow-2xs placeholder:text-[#94a3b8] transition-all focus:outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20 disabled:cursor-not-allowed disabled:opacity-50 ${endAdornment ? 'pr-11' : ''} ${
            error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]/25' : ''
          } ${className}`}
            {...props}
          />
          {endAdornment && <div className="absolute inset-y-0 right-2 flex items-center">{endAdornment}</div>}
        </div>
        {error && <p className="text-xs font-medium text-[#ef4444]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
