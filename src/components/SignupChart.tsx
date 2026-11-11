import { formatNumber } from '@/lib/format';
import type { Stats } from '@/lib/types';

const W = 720, H = 180, GROUP = W / 30, BAR = 9;

/** Daily sign-ups, creators and brands side by side, one group per IST day. Plain SVG; each bar carries a <title>. */
export function SignupChart({ days }: { days: Stats['signupsByDay'] }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.creators, d.brands])); // never 0: no divide-by-zero on empty data
  const sum = (k: 'creators' | 'brands') => days.reduce((n, d) => n + d[k], 0);
  const summary = `Sign-ups per day over the last ${days.length} days: ${formatNumber(sum('creators'))} creators and ${formatNumber(sum('brands'))} brands. Busiest day: ${formatNumber(max)}.`;
  const bar = (v: number, x: number, cls: string, label: string) => {
    const h = (v / max) * (H - 4);
    return (
      <rect x={x} y={H - h} width={BAR} height={h} rx={2} className={cls}>
        <title>{label}</title>
      </rect>
    );
  };
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-44 w-full">
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-line-strong" strokeWidth={1} />
        {days.map((d, i) => {
          const x = i * GROUP + (GROUP - 2 * BAR - 2) / 2;
          return (
            <g key={d.day} data-day={d.day}>
              {bar(d.creators, x, 'fill-violet', `${d.day}: ${d.creators} creators`)}
              {bar(d.brands, x + BAR + 2, 'fill-violet-deep', `${d.day}: ${d.brands} brands`)}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-caption text-ink-muted" aria-hidden>
        <span>{days[0]?.day}</span>
        <span>Peak {formatNumber(max === 1 && days.every((d) => !d.creators && !d.brands) ? 0 : max)} a day</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-muted">
        <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-xs bg-violet" />Creator sign-ups</span>
        <span className="flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-xs bg-violet-deep" />Brand sign-ups</span>
        <span className="sr-only">{summary}</span>
      </figcaption>
    </figure>
  );
}
