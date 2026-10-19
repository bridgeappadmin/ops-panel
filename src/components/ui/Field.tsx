import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type Common = {
  label?: string;
  /** Danger border and caption under the field. */
  error?: string | null;
  hint?: string;
  /** outlined: white, 1.5 line border, 54 tall (forms). filled: field fill, 60 tall (sign-in). */
  variant?: 'outlined' | 'filled';
};
type InputProps = InputHTMLAttributes<HTMLInputElement>;
type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
/** An input, or a multi-line textarea with `area`. */
export type FieldProps = Common & (({ area?: false } & InputProps) | ({ area: true } & AreaProps));

export function Field({ label, error, hint, variant = 'outlined', className = '', id, area, ...rest }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const help = error || hint;
  const helpId = `${fieldId}-help`;
  const a11y = { id: fieldId, 'aria-invalid': error ? true : undefined, 'aria-describedby': help ? helpId : undefined };
  // Exactly one border colour: Tailwind orders same-property utilities by name, not by class order. Error wins over focus.
  const border = error ? 'border-danger' : `${variant === 'filled' ? 'border-transparent' : 'border-line'} focus:border-violet`;
  const box = `w-full rounded-md border-[1.5px] px-4 text-ink outline-none transition-colors placeholder:text-ink-faint caret-violet
    disabled:opacity-50 ${variant === 'filled' ? 'bg-field' : 'bg-white'} ${border}`;

  return (
    <div className={className}>
      {label ? <label htmlFor={fieldId} className="mb-1.5 block text-caption-sb text-ink">{label}</label> : null}
      {area ? (
        <textarea {...(rest as AreaProps)} {...a11y} className={`${box} min-h-28 py-3 text-small`} />
      ) : (
        <input {...(rest as InputProps)} {...a11y} className={`${box} text-body-md ${variant === 'filled' ? 'h-15' : 'h-13.5'}`} />
      )}
      {help ? <p id={helpId} role={error ? 'alert' : undefined} className={`mt-1.5 text-caption ${error ? 'text-danger' : 'text-ink-muted'}`}>{help}</p> : null}
    </div>
  );
}
