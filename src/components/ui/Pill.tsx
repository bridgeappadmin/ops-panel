export type PillTone = 'violet' | 'success' | 'warning' | 'danger' | 'neutral';

// The tone at 12-14% for the fill and in full for the text, as the client's Pill.
const TINT: Record<PillTone, string> = {
  violet: 'bg-violet/12 text-violet',
  success: 'bg-success/13 text-success',
  warning: 'bg-warning/14 text-warning',
  danger: 'bg-danger/13 text-danger',
  neutral: 'bg-surface-tint text-ink-muted',
};
const SOLID: Record<PillTone, string> = {
  violet: 'bg-violet',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-ink-muted',
};

/** Status pill ("active", "redeemed"…). `solid` fills it with the tone and a white label. */
export function Pill({ label, tone = 'neutral', solid = false, className = '' }: { label: string; tone?: PillTone; solid?: boolean; className?: string }) {
  return (
    <span className={`inline-flex h-6.25 items-center whitespace-nowrap rounded-pill px-2.5 text-pill ${solid ? `${SOLID[tone]} text-white` : TINT[tone]} ${className}`}>
      {label}
    </span>
  );
}
