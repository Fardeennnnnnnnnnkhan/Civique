import React from 'react';

/**
 * Orbitron Tech Glyph Mark for compact / icon-only viewports.
 */
export function CiviqueLogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        fontFamily: 'var(--font-orbitron), sans-serif',
      }}
      className={`inline-flex items-center justify-center rounded-xl bg-[#143527] text-white font-black shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform ${className}`}
      aria-hidden="true"
    >
      <span className="text-[1.1em] font-black tracking-wider leading-none text-white">
        C
      </span>
    </div>
  );
}

/**
 * Written Tech Wordmark Logo for Civique in Orbitron font.
 */
export function CiviqueLogo({
  size = 32,
  showText = true,
  className = '',
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  // If icon-only is requested
  if (!showText) {
    return <CiviqueLogoMark size={size} className={className} />;
  }

  // Pure written Orbitron logo matching login page
  return (
    <div className={`inline-flex items-center select-none group cursor-pointer ${className}`}>
      <span
        style={{
          fontFamily: 'var(--font-orbitron), sans-serif',
          letterSpacing: '0.07em',
        }}
        className="font-black text-[#143527] tracking-wider text-[1.4rem] leading-none group-hover:text-black transition-colors"
      >
        Civique
      </span>
    </div>
  );
}

