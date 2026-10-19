'use client';

import { useEffect, useRef, useState } from 'react';
import { Field } from '@/components/ui';
import { api } from '@/lib/api';
import type { Venue, VenueSearchResponse } from '@/lib/types';

/** Venue search: 300 ms after the last keystroke, 2+ characters. Names are rendered as text. */
export function VenueSearch({ onPick }: { onPick: (venue: Venue) => void }) {
  const [results, setResults] = useState<Venue[]>([]);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0); // ignores an answer that a newer search has overtaken
  useEffect(() => () => clearTimeout(timer.current), []);

  function change(text: string) {
    clearTimeout(timer.current);
    const q = text.trim();
    const n = ++latest.current;
    if (q.length < 2) { setResults([]); setError(''); return; }
    timer.current = setTimeout(() => {
      api<VenueSearchResponse>(`/admin/brands?q=${encodeURIComponent(q)}`).then(
        (r) => { if (n === latest.current) { setResults(r.brands); setError(''); } },
        (e: Error) => { if (n === latest.current) setError(e.message); },
      );
    }, 300);
  }

  return (
    <div>
      <Field label="Search venues" placeholder="Venue name (2+ characters)" onChange={(e) => change(e.target.value)} error={error} />
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-white">
          {results.map((b) => (
            <li key={b._id}>
              <button type="button" className="w-full px-4 py-3 text-left text-body hover:bg-surface-tint" onClick={() => { onPick(b); setResults([]); }}>
                {b.name ?? '—'} {b.username ? `@${b.username}` : ''} {b.city ?? ''} {b.phoneNumber ?? ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
