/** The interlock mark's two halves in their 45.3 × 54.4 authoring box (client/src/components/ui/Logo.tsx). */
const LOGO_VB = { w: 45.3, h: 54.4 };
const LOGO_LEFT_D = 'M22.6 5.7V27.2L17.7 24.4C9 19.4 3.6 10.1 3.6 0H0V24.6C0 32.6 4.6 40 11.9 43.5L22.7 48.7V27.2L22.6 5.7Z';
const LOGO_RIGHT_D = 'M22.7 27.2L27.6 30C36.3 35 41.7 44.3 41.7 54.4H45.3V29.8C45.3 21.8 40.7 14.4 33.4 10.9L22.6 5.7V27.2Z';

/** brand: on white / cloud. onViolet: on violet. onInk: on ink and the header band. mono: currentColor. */
export type LogoTone = 'brand' | 'onViolet' | 'onInk' | 'mono';
const FILLS: Record<LogoTone, [string, string]> = {
  brand: ['fill-violet', 'fill-lavender-mid'],
  onViolet: ['fill-white', 'fill-lavender'],
  onInk: ['fill-violet', 'fill-lavender'],
  mono: ['fill-current', 'fill-current'],
};

/** The interlock mark. `size` is the height in px; the width follows the 45.3:54.4 ratio. */
export function LogoMark({ size = 48, tone = 'brand', className = '' }: { size?: number; tone?: LogoTone; className?: string }) {
  const [left, right] = FILLS[tone];
  return (
    <svg width={(size * LOGO_VB.w) / LOGO_VB.h} height={size} viewBox={`0 0 ${LOGO_VB.w} ${LOGO_VB.h}`} aria-hidden className={className}>
      <path d={LOGO_LEFT_D} className={left} />
      <path d={LOGO_RIGHT_D} className={right} />
    </svg>
  );
}

/** Mark + "Tazmify" in Urbanist: ink on light, white on dark tones. */
export function LogoLockup({ markSize = 28, tone = 'brand', className = '' }: { markSize?: number; tone?: LogoTone; className?: string }) {
  const word = tone === 'onViolet' || tone === 'onInk' ? 'text-white' : 'text-ink';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} tone={tone} />
      <span
        className={`font-display font-bold ${word}`}
        style={{ fontSize: markSize * 0.82, lineHeight: `${markSize}px`, letterSpacing: -markSize * 0.03 }}
      >
        Tazmify
      </span>
    </span>
  );
}
