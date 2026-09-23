'use client';

import React, { useState, useEffect } from 'react';
import { CiviqueLogoMark } from '../../components/CiviqueLogo';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  fullscreen?: boolean;
  compact?: boolean;
  showProgress?: boolean;
}

const DEFAULT_MILESTONES = [
  'Verifying municipal security credentials...',
  'Connecting to live civic event stream...',
  'Synchronizing spatial ward boundaries...',
  'Preparing interactive municipal workspace...',
];

export default function LoadingState({
  title = 'Civique Municipal Engine',
  description,
  fullscreen = false,
  compact = false,
  showProgress = true,
}: LoadingStateProps) {
  const [milestoneIndex, setMilestoneIndex] = useState(0);

  useEffect(() => {
    if (description) return;
    const interval = setInterval(() => {
      setMilestoneIndex((prev) => (prev + 1) % DEFAULT_MILESTONES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [description]);

  const activeStatus = description || DEFAULT_MILESTONES[milestoneIndex];

  const content = (
    <div
      className={`flex flex-col items-center justify-center text-center select-none font-sans ${
        compact ? 'p-4 space-y-3' : 'p-8 sm:p-12 space-y-6 max-w-md w-full'
      }`}
    >
      {/* Visual Orbital Ring Engine */}
      <div className="relative flex items-center justify-center">
        {/* Soft forest ambient glow aura */}
        <div
          className="absolute -inset-4 rounded-full bg-[#143527]/10 blur-xl animate-pulse pointer-events-none"
          aria-hidden="true"
        />

        {/* Outer orbital spinning ring */}
        <div
          className={`rounded-full border-2 border-[#eef1ea] border-t-[#143527] animate-spin ${
            compact ? 'size-12' : 'size-20'
          }`}
          style={{ animationDuration: '2.5s' }}
        />

        {/* Inner reverse rotating ring */}
        <div
          className={`absolute rounded-full border border-dashed border-[#143527]/30 border-b-[#143527] animate-spin ${
            compact ? 'size-8' : 'size-14'
          }`}
          style={{ animationDuration: '3.8s', animationDirection: 'reverse' }}
        />

        {/* Center Tech Emblem Mark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <CiviqueLogoMark
            size={compact ? 22 : 32}
            className="shadow-xs ring-2 ring-[#143527]/20"
          />
        </div>
      </div>

      {/* Title & Dynamic Status Description */}
      <div className="space-y-1.5 w-full">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-[#143527] animate-ping" />
          <h4
            className={`font-bold tracking-tight text-[#0f172a] ${
              compact ? 'text-xs' : 'text-sm sm:text-base'
            }`}
          >
            {title}
          </h4>
        </div>

        <p
          key={activeStatus}
          className={`text-[#64748b] leading-relaxed font-medium transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-1 ${
            compact ? 'text-[11px]' : 'text-xs sm:text-sm'
          }`}
        >
          {activeStatus}
        </p>
      </div>

      {/* Sleek Civic Shimmer Progress Indicator */}
      {showProgress && !compact && (
        <div className="w-48 sm:w-56 h-1 rounded-full bg-[#eef1ea] overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#143527] via-[#225740] to-[#143527] rounded-full animate-pulse"
            style={{
              width: '65%',
              animation: 'civique-shimmer 2s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md">
        <div className="relative rounded-3xl border border-[#eef1ea] bg-white shadow-2xl p-6 sm:p-8">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[300px] w-full">
      {content}
    </div>
  );
}
