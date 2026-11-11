import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant =
  /** Violet fill, white label, violet glow: the one CTA per page. */
  | 'primary'
  /** White, hairline border, ink label. */
  | 'secondary'
  /** violetTint fill, violet label. */
  | 'tint'
  | 'danger'
  /** No chrome, violet label. */
  | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-violet text-white enabled:shadow-violet enabled:hover:bg-violet-pressed',
  secondary: 'bg-white text-ink border border-line-strong enabled:hover:bg-cloud',
  tint: 'bg-violet-tint text-violet-pressed enabled:hover:bg-lavender/60',
  danger: 'bg-danger-ink text-white enabled:hover:bg-danger-ink/90',
  ghost: 'bg-transparent text-violet-pressed enabled:hover:bg-violet-tint',
};
const SIZE: Record<ButtonSize, string> = {
  lg: 'h-12 px-5 rounded-md text-body-sb',
  md: 'h-11 px-4.5 rounded-md text-body-sb',
  sm: 'h-10 px-3.5 rounded-sm text-small-sb',
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
