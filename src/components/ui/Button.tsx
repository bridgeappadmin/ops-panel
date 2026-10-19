import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant =
  /** Violet fill, white label, violet glow: the one CTA per page. */
  | 'primary'
  /** White, 1.5 line border, ink label. */
  | 'secondary'
  /** surfaceTint fill, violet label: the paired action in dialogs. */
  | 'tint'
  | 'danger'
  /** No chrome, violet label. */
  | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-violet text-white enabled:shadow-violet enabled:hover:bg-violet-pressed',
  secondary: 'bg-white text-ink border-[1.5px] border-line enabled:hover:border-line-strong',
  tint: 'bg-surface-tint text-violet enabled:hover:bg-violet-tint',
  danger: 'bg-danger text-white',
  ghost: 'bg-transparent text-violet enabled:hover:bg-surface-tint',
};
// Page CTAs use the Urbanist display face; sm (dialogs, sheets, table rows) uses Inter.
const SIZE: Record<ButtonSize, string> = {
  lg: 'h-15 px-5 rounded-lg font-display text-h4',
  md: 'h-14 px-4.5 rounded-lg font-display text-h5',
  sm: 'h-12.5 px-4 rounded-md text-body-sb',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Spinner in place of the label; the button is disabled meanwhile. */
  loading?: boolean;
  /** Fill the parent's width. */
  block?: boolean;
};

export function Button({ variant = 'primary', size = 'md', loading = false, block = false, disabled, type = 'button', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors outline-violet focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {/* Kept in the layout (and the accessible name) while loading, so the button doesn't change size. */}
      <span className={`inline-flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>{children}</span>
      {loading ? <span aria-hidden className="absolute size-5 animate-spin rounded-pill border-2 border-current border-t-transparent" /> : null}
    </button>
  );
}
