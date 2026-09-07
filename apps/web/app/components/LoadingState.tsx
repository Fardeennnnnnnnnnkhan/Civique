'use client';

import React from 'react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] w-full bg-white text-center space-y-4 p-8">
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Pulsing outer container */}
        <span className="absolute animate-ping inline-flex h-12 w-12 rounded-2xl bg-[#5E1801] opacity-20"></span>
        {/* Inner container */}
        <div className="relative w-10 h-10 rounded-xl bg-[#5E1801] flex items-center justify-center shadow-md">
          <img src="/civique.png" alt="Civique" className="w-5 h-5 object-contain invert brightness-200" />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold tracking-widest text-[#2B2523] uppercase">Loading Civique</h4>
        <p className="text-xs text-[#6F625C] font-light">Connecting to Indore municipal gateway...</p>
      </div>
    </div>
  );
}
