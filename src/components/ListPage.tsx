'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Card, Chip, Field, Pager, Skeleton, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import type { AccountPage } from '@/lib/types';

export interface Column<T> { header: string; cell: (row: T) => ReactNode }
export interface Filter { label: string; value: string }

/**
 * A searchable, filterable, paged list of `GET {path}?q=&status=&page=`. The first column links to `rowHref(row)`.
 * `filters` are status chips ('' = no filter); the search waits 300 ms after the last keystroke.
 */
export function ListPage<T extends { _id: string }>({ path, filters, columns, rowHref, searchLabel = 'Search', hideSearch = false }: {
  path: string; filters: Filter[]; columns: Column<T>[]; rowHref: (row: T) => string; searchLabel?: string; hideSearch?: boolean;
}) {
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState({ q: '', status: '', page: 1 });
  const [data, setData] = useState<AccountPage<T> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery((s) => (s.q === typed.trim() ? s : { ...s, q: typed.trim(), page: 1 })), 300);
    return () => clearTimeout(t);
  }, [typed]);

  useEffect(() => {
    let stale = false;
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.status) params.set('status', query.status);
    params.set('page', String(query.page));
    api<AccountPage<T>>(`${path}?${params}`).then(
      (r) => { if (!stale) { setData(r); setError(''); } },
      (e: Error) => { if (!stale) setError(e.message); },
    );
    return () => { stale = true; };
  }, [path, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {hideSearch ? null : <Field label={searchLabel} type="search" value={typed} maxLength={100} onChange={(e) => setTyped(e.target.value)} className="w-full sm:w-80" />}
        <div className="flex flex-wrap gap-2 pb-1.5">
          {filters.map((f) => <Chip key={f.value} label={f.label} selected={query.status === f.value} onClick={() => setQuery({ ...query, status: f.value, page: 1 })} />)}
        </div>
      </div>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      {data === null ? (error ? null : <Skeleton className="h-40 w-full" />) : (
        <Card padded={false}>
          {data.results.length === 0 ? <p className="p-6 text-ink-muted">Nothing found.</p> : (
            <Table>
              <thead><tr>{columns.map((c) => <Th key={c.header}>{c.header}</Th>)}</tr></thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row._id}>
                    {columns.map((c, i) => (
                      <Td key={c.header}>{i === 0 ? <Link href={rowHref(row)} className="text-violet hover:underline">{c.cell(row)}</Link> : c.cell(row)}</Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pager page={data.page} totalPages={data.totalPages} onPage={(page) => setQuery({ ...query, page })} />
        </Card>
      )}
    </div>
  );
}
