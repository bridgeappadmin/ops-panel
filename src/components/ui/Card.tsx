import type { HTMLAttributes } from 'react';

/** White card, radius 22, 1px line border. `elevated` swaps the border for the soft violet-tinted shadow. */
export function Card({ elevated = false, padded = true, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { elevated?: boolean; padded?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-white ${elevated ? 'shadow-card' : 'border border-line'} ${padded ? 'p-4' : ''} ${className}`}
      {...rest}
    />
  );
}
