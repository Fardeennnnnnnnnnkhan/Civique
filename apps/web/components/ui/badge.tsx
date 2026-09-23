import type { ReactNode } from 'react';

export type BadgeTone = 'primary' | 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'outline';

const toneClasses: Record<BadgeTone, string> = {
  primary: 'bg-[#143527] text-white font-bold shadow-2xs',
  neutral: 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]',
  info: 'bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd]',
  success: 'bg-[#f2f7f4] text-[#143527] border border-[#d6e5da]',
  warning: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
  danger: 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]',
  outline: 'bg-white text-[#0f172a] border border-[#e2e8f0]',
};

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'RESOLVED':
    case 'VERIFIED':
      return (
        <Badge tone="success">
          <span className="h-1.5 w-1.5 rounded-full bg-[#143527]" />
          Resolved
        </Badge>
      );
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return (
        <Badge tone="warning">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d97706] animate-pulse" />
          In Progress
        </Badge>
      );
    case 'OPEN':
    case 'ACKNOWLEDGED':
      return (
        <Badge tone="info">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0284c7]" />
          Open
        </Badge>
      );
    case 'AI_REVIEW':
    case 'REPORTED':
      return (
        <Badge tone="success">
          <span className="h-1.5 w-1.5 rounded-full bg-[#143527]" />
          AI Review
        </Badge>
      );
    case 'REJECTED':
    case 'ESCALATED':
      return (
        <Badge tone="danger">
          <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
          {normalized === 'ESCALATED' ? 'Escalated' : 'Rejected'}
        </Badge>
      );
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

export function PriorityBadge({ priority }: { priority: string }) {
  const normalized = priority.toUpperCase();
  switch (normalized) {
    case 'CRITICAL':
    case 'P0':
      return <Badge tone="danger">CRITICAL</Badge>;
    case 'HIGH':
    case 'P1':
      return <Badge tone="warning">HIGH</Badge>;
    case 'MEDIUM':
    case 'P2':
      return <Badge tone="info">MEDIUM</Badge>;
    case 'LOW':
    case 'P3':
    default:
      return <Badge tone="neutral">LOW</Badge>;
  }
}
