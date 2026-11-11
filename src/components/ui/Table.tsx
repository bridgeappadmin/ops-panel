import type { TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

/** A styled table in a scrolling card-width wrapper. Put <thead>/<tbody> inside; rows use Th and Td. Body rows tint on hover. */
export function Table({ className = '', ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-body tabular-nums [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-cloud ${className}`} {...rest} />
    </div>
  );
}
export function Th({ className = '', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={`whitespace-nowrap bg-cloud px-5 py-3 text-caption-sb text-ink-muted ${className}`} {...rest} />;
}
export function Td({ className = '', ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`border-t border-line px-5 py-3.5 align-middle ${className}`} {...rest} />;
}
