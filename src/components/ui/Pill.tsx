export type PillTone = 'violet' | 'success' | 'warning' | 'danger' | 'neutral';

// Tint fill, dark text (4.5:1) and a dot in the tone's own colour.
const TINT: Record<PillTone, string> = {
  violet: 'bg-violet-tint text-violet-pressed',
  success: 'bg-success-tint text-success-ink',
  warning: 'bg-warning-tint text-warning-ink',
  danger: 'bg-danger-tint text-danger-ink',
  neutral: 'bg-mist text-ink-muted',
};
const DOT: Record<PillTone, string> = {
  violet: 'bg-violet',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-ink-faint',
};

/** Status pill ("active", "redeemed"…). The first letter shows capitalised; the text itself is left as given. */
export function Pill({ label, tone = 'neutral', className = '' }: { label: string; tone?: PillTone; className?: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-caption-sb ${TINT[tone]} ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-pill ${DOT[tone]}`} />
      <span className="inline-block first-letter:uppercase">{label}</span>
    </span>
  );
}
