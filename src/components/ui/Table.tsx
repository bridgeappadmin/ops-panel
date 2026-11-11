import type { TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

/** A styled table in a scrolling card-width wrapper. Put <thead>/<tbody> inside; rows use Th and Td. */
export function Table({ className = '', ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <div className="overflow-x-auto"><table className={`w-full text-left text-body ${className}`} {...rest} /></div>;
}
export function Th({ className = '', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={`px-4 py-3 text-caption-sb font-semibold text-ink-muted ${className}`} {...rest} />;
}
export function Td({ className = '', ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`border-t border-line px-4 py-3 align-middle ${className}`} {...rest} />;
}
