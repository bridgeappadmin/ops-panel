import type { ReactNode } from 'react';

/** The deep-ink band at the top of every page, with the design's one soft violet glow. Text on it is white. */
export function HeaderBand({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-violet-deep text-white ${className}`}>
      <div aria-hidden className="band-glow" />
      <div className="relative">{children}</div>
    </div>
  );
}
