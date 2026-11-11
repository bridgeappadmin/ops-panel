'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, Card, Icon, Pager, Skeleton, Table, Tabs, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import type { AccountPage } from '@/lib/types';

export interface Column<T> { header: string; cell: (row: T) => ReactNode; align?: 'right' }
export interface Filter { label: string; value: string }

/** A list's identity cell: avatar, name, and a muted second line. */
export function Who({ name, sub, src }: { name: string; sub?: string; src?: string }) {
  return (
    <span className="flex items-center gap-3">
      <Avatar name={name} src={src} />
      <span className="min-w-0">
        <span className="block font-semibold">{name}</span>
        {sub ? <span className="block text-small text-ink-muted">{sub}</span> : null}
      </span>
    </span>
  );
}

/**
 * A searchable, filterable, paged list of `GET {path}?q=&status=&page=`, in one card. The first column links to `rowHref(row)`.
 * `filters` are status tabs ('' = no filter), starting at `initialStatus`; the search waits 300 ms after the last keystroke.
 */
export function ListPage<T extends { _id: string }>({ path, filters, columns, rowHref, searchLabel = 'Search', hideSearch = false, initialStatus = '' }: {
  path: string; filters: Filter[]; columns: Column<T>[]; rowHref: (row: T) => string; searchLabel?: string; hideSearch?: boolean; initialStatus?: string;
}) {
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState({ q: '', status: initialStatus, page: 1 });
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
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 border-b border-line px-5">
        <Tabs label="Filter by status" options={filters} value={query.status} onChange={(status) => setQuery({ ...query, status, page: 1 })} />
        {hideSearch ? null : (
          <label className="my-2.5 flex h-10 w-full items-center gap-2.5 rounded-md border border-line-strong bg-white px-3 text-ink-muted transition-colors focus-within:border-violet sm:w-80">
            <Icon name="search" size={16} />
            <input type="search" aria-label={searchLabel} placeholder={searchLabel} value={typed} maxLength={100} onChange={(e) => setTyped(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-ink-muted" />
          </label>
        )}
      </div>
      {error ? <p role="alert" className="px-5 pt-4 text-danger-ink">{error}</p> : null}
      {data === null ? (error ? null : <div className="space-y-3 p-5"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-2/3" /></div>) : (
        <>
          {data.results.length === 0 ? <p className="px-5 py-14 text-center text-ink-muted">Nothing found.</p> : (
            <Table>
              <thead><tr>{columns.map((c) => <Th key={c.header} className={c.align === 'right' ? 'text-right' : ''}>{c.header}</Th>)}</tr></thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={row._id}>
                    {columns.map((c, i) => (
                      <Td key={c.header} className={c.align === 'right' ? 'text-right' : ''}>
                        {i === 0 ? <Link href={rowHref(row)} className="block text-ink hover:text-violet-pressed">{c.cell(row)}</Link> : c.cell(row)}
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pager page={data.page} totalPages={data.totalPages} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </Card>
  );
}
