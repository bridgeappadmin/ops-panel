const TINTS = [
  'bg-violet-tint text-violet-pressed',
  'bg-sky-tint text-sky-ink',
  'bg-warning-tint text-warning-ink',
  'bg-success-tint text-success-ink',
  'bg-rose-tint text-rose-ink',
];

/** The person's picture when it is an https URL, else their initials on a tint the name picks. Decorative: the name sits next to it. */
export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  if (src && /^https:\/\//.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element -- remote profile pictures from any host; next/image would need each host listed
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-pill bg-mist object-cover" style={{ width: size, height: size }} />;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const tint = TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-pill font-semibold ${tint}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {initials}
    </span>
  );
}
