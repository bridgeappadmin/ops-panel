import Link from 'next/link';

type ChipProps = {
  label: string;
  selected?: boolean;
  /** Selected as violetTint with a violet label instead of a violet fill. */
  soft?: boolean;
  /** On the header band. */
  onDark?: boolean;
  size?: 'md' | 'sm';
  /** A link chip (nav); `selected` marks the current page. */
  href?: string;
  onClick?: () => void;
  className?: string;
};

function tone(selected: boolean, soft: boolean, onDark: boolean) {
  if (selected) return soft ? 'bg-violet-tint text-violet' : onDark ? 'bg-white text-ink' : 'bg-violet text-white';
  return onDark ? 'bg-white/14 text-white hover:bg-white/22' : 'bg-surface-tint text-ink-muted hover:text-ink';
}

/** Filter / tag chip. A button with `onClick`, a link with `href`, plain text otherwise. */
export function Chip({ label, selected = false, soft = false, onDark = false, size = 'md', href, onClick, className = '' }: ChipProps) {
  const cls = `inline-flex items-center gap-1.5 rounded-pill transition-colors outline-violet focus-visible:outline-2 focus-visible:outline-offset-2
    ${size === 'sm' ? 'min-h-7.5 px-3 text-caption-sb' : 'min-h-9.5 px-4 text-small-sb'} ${tone(selected, soft, onDark)} ${className}`;
  if (href) return <Link href={href} aria-current={selected ? 'page' : undefined} className={cls}>{label}</Link>;
  if (onClick) return <button type="button" aria-pressed={selected} onClick={onClick} className={cls}>{label}</button>;
  return <span className={cls}>{label}</span>;
}
