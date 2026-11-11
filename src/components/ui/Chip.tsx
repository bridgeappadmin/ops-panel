/** A choice chip: a button with aria-pressed when it has `onClick`, a plain tag otherwise. */
export function Chip({ label, selected = false, onClick, className = '' }: { label: string; selected?: boolean; onClick?: () => void; className?: string }) {
  const cls = `inline-flex min-h-9 items-center rounded-pill px-3.5 text-small-sb transition-colors outline-violet focus-visible:outline-2 focus-visible:outline-offset-2
    ${selected ? 'bg-violet text-white' : 'bg-violet-tint text-violet-pressed hover:bg-lavender/60'} ${className}`;
  if (onClick) return <button type="button" aria-pressed={selected} onClick={onClick} className={cls}>{label}</button>;
  return <span className={cls}>{label}</span>;
}
