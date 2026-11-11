import type { HTMLAttributes } from 'react';

/** White card, radius 16, 1px line border. `elevated` swaps the border for the soft violet-tinted shadow. */
export function Card({ elevated = false, padded = true, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { elevated?: boolean; padded?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-white ${elevated ? 'shadow-card' : 'border border-line'} ${padded ? 'p-6' : ''} ${className}`}
      {...rest}
    />
  );
}
