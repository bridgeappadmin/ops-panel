import type { ReactNode } from 'react';

export interface Stat { label: string; value: ReactNode; testId?: string }

/** A strip of labelled numbers in one card, hairlines between them, wrapping on narrow screens. */
export function Stats({ items }: { items: Stat[] }) {
  return (
    <dl className="flex flex-wrap overflow-hidden rounded-lg border border-line bg-white">
      {/* -ml-px/-mt-px tuck each cell's left and top hairline under the card's edge on the first column and row. */}
      {items.map((s) => (
        <div key={s.label} className="-mt-px -ml-px min-w-40 flex-1 border-t border-l border-line px-5 py-4">
          <dt className="text-small text-ink-muted">{s.label}</dt>
          <dd data-testid={s.testId} className="mt-1 font-display text-h2 tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
