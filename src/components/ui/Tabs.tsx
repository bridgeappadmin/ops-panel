/** Underlined filter tabs. Each is a button with aria-pressed, the same semantics as the chips they replaced. */
export function Tabs<T extends string>({ label, options, value, onChange }: {
  label: string; options: { label: string; value: T }[]; value: T; onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="-mb-px flex gap-6 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-13 shrink-0 whitespace-nowrap border-b-2 text-body-sb transition-colors outline-violet focus-visible:outline-2 ${value === o.value ? 'border-violet text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
