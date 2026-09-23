import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent' | 'default';
export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#143527] text-white font-bold shadow-xs hover:bg-[#0e271c] hover:shadow-sm transition-all active:scale-[0.99]',
  default: 'bg-[#143527] text-white font-bold shadow-xs hover:bg-[#0e271c] hover:shadow-sm transition-all active:scale-[0.99]',
  secondary: 'bg-[#334155] text-[#f8fafc] font-medium hover:bg-[#1e293b] transition-all active:scale-[0.99]',
  outline: 'border border-[#e2e8f0] bg-white text-[#0f172a] font-medium hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all',
  ghost: 'text-[#0f172a] font-medium hover:bg-[#f1f5f9] transition-all',
  destructive: 'bg-[#ef4444] text-white font-medium hover:bg-[#dc2626] transition-all active:scale-[0.99]',
  accent: 'bg-[#f2f7f4] text-[#143527] border border-[#d6e5da] font-bold hover:bg-[#e6efe9] transition-all',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-8 h-8 px-3 text-xs rounded-lg',
  default: 'min-h-10 h-10 px-4 py-2 text-sm rounded-xl',
  lg: 'min-h-12 h-12 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 p-0 rounded-xl flex items-center justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143527] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
