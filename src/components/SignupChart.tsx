import { formatDay, formatNumber } from '@/lib/format';
import type { Stats } from '@/lib/types';

const W = 720, H = 220;

/**
 * Daily sign-ups as two lines (creators over a soft fill, brands), one IST day per point. Plain SVG; each day is a
 * hover column carrying a <title>, so the browser's own tooltip reads out that day.
 */
export function SignupChart({ days }: { days: Stats['signupsByDay'] }) {
  const peak = Math.max(0, ...days.flatMap((d) => [d.creators, d.brands]));
  const max = Math.max(4, Math.ceil(peak / 4) * 4); // gridlines at quarters land on whole numbers; never 0
  const x = (i: number) => (days.length > 1 ? (i / (days.length - 1)) * W : W / 2);
  const y = (v: number) => H - (v / max) * H;
  const line = (k: 'creators' | 'brands') => days.map((d, i) => `${x(i)},${y(d[k])}`).join(' ');
  const sum = (k: 'creators' | 'brands') => days.reduce((n, d) => n + d[k], 0);
  const step = W / Math.max(1, days.length - 1);
  const summary = `Sign-ups per day over the last ${days.length} days: ${formatNumber(sum('creators'))} creators and ${formatNumber(sum('brands'))} brands. Busiest day: ${formatNumber(peak)}.`;

  return (
    <figure>
      <figcaption className="mb-5 flex flex-wrap gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-small text-ink-muted"><i aria-hidden className="size-2.5 rounded-[3px] bg-violet" />Creator sign-ups <b className="font-semibold text-ink">{formatNumber(sum('creators'))}</b></span>
        <span className="flex items-center gap-2 text-small text-ink-muted"><i aria-hidden className="size-2.5 rounded-[3px] bg-violet-deep" />Brand sign-ups <b className="font-semibold text-ink">{formatNumber(sum('brands'))}</b></span>
        <span className="sr-only">{summary}</span>
      </figcaption>
      <div className="flex gap-3">
        <div aria-hidden className="relative w-7 shrink-0 text-right text-caption text-ink-muted" style={{ height: H }}>
          {[4, 3, 2, 1, 0].map((q) => (
            <span key={q} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - q * 25}%` }}>{formatNumber((max * q) / 4)}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={summary} className="w-full" style={{ height: H }}>
          {[0, 1, 2, 3].map((q) => <line key={q} x1={0} x2={W} y1={(H * q) / 4} y2={(H * q) / 4} className="stroke-line" vectorEffect="non-scaling-stroke" />)}
          <line x1={0} x2={W} y1={H} y2={H} className="stroke-line-strong" vectorEffect="non-scaling-stroke" />
          {days.map((d, i) => (
            <g key={d.day} data-day={d.day}>
              <rect x={x(i) - step / 2} y={0} width={step} height={H} className="fill-transparent hover:fill-violet/6" />
              <title>{`${formatDay(d.day)}: ${d.creators} creators, ${d.brands} brands`}</title>
            </g>
          ))}
          <polygon points={`0,${H} ${line('creators')} ${W},${H}`} className="pointer-events-none fill-violet/10" />
          <polyline points={line('creators')} fill="none" className="pointer-events-none stroke-violet" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={line('brands')} fill="none" className="pointer-events-none stroke-violet-deep" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      {days.length ? (
        <div aria-hidden className="mt-2 ml-10 flex justify-between text-caption text-ink-muted">
          <span>{formatDay(days[0].day)}</span>
          <span>{formatDay(days[Math.floor(days.length / 2)].day)}</span>
          <span>{formatDay(days[days.length - 1].day)}</span>
        </div>
      ) : null}
    </figure>
  );
}
