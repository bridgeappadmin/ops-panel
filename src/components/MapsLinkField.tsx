'use client';

import { useRef, useState } from 'react';
import { Field } from '@/components/ui';
import { parseCoords } from '@/lib/offerForm';
import { isShortMapsLink, parseMapsLink, type MapsPlace } from '@/lib/mapsLink';

const NOT_A_PLACE = "This isn't a Google Maps place link. In Google Maps, open the café and use Share → Copy link.";

/**
 * "Google Maps link" input plus the preview of `coords` (the form's "lat, lng"). A pasted link (full, or a short one
 * expanded by /maps-link) is handed to `onPlace`; the form then owns the coordinates. Place name and the centre-only
 * warning show only while `coords` still equals what the link gave.
 */
export function MapsLinkField({ coords, onPlace }: { coords: string; onPlace: (place: MapsPlace) => void }) {
  const [link, setLink] = useState('');
  const [place, setPlace] = useState<MapsPlace | null>(null);
  const [error, setError] = useState('');
  const seen = useRef(''); // paste, change and blur all report the same text: read it once
  const latest = useRef(0); // ignores an answer that a newer link has overtaken

  async function read(raw: string) {
    const text = raw.trim();
    if (text === seen.current) return;
    seen.current = text;
    const n = ++latest.current;
    setError('');
    if (!text) { setPlace(null); return; }
    let found = parseMapsLink(text);
    if (!found && isShortMapsLink(text)) {
      try {
        const res = await fetch(`/maps-link?url=${encodeURIComponent(text)}`);
        const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
        if (!res.ok || !body.url) throw new Error(body.message || 'Could not open that link.');
        found = parseMapsLink(body.url);
      } catch (e) {
        if (n === latest.current) { setPlace(null); setError((e as Error).message); }
        return;
      }
    }
    if (n !== latest.current) return;
    setPlace(found);
    if (found) onPlace(found); else setError(NOT_A_PLACE);
  }

  const at = parseCoords(coords);
  const fromLink = place && at && at.lat === place.lat && at.lng === place.lng ? place : null;

  return (
    <div className="space-y-3">
      <Field
        label="Google Maps link"
        placeholder="https://maps.app.goo.gl/…"
        value={link}
        error={error}
        onChange={(e) => { setLink(e.target.value); void read(e.target.value); }}
        onPaste={(e) => void read(e.clipboardData.getData('text'))}
        onBlur={(e) => void read(e.target.value)}
      />
      {at ? (
        <div className="space-y-2">
          {fromLink?.name ? <p className="text-body-sb">{fromLink.name}</p> : null}
          <p className="text-body text-ink-muted">{at.lat}, {at.lng}</p>
          {fromLink && !fromLink.exact ? (
            <p className="text-caption text-warning">
              This is the map&apos;s centre, not a pinned place. Use the place&apos;s own Share link for its exact location.
            </p>
          ) : null}
          <div className="overflow-hidden rounded-md border border-line">
            <iframe
              title="Map preview"
              src={`https://maps.google.com/maps?q=${at.lat},${at.lng}&z=16&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-56 w-full"
            />
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sb text-violet hover:underline"
          >
            Open in Google Maps
          </a>
        </div>
      ) : null}
    </div>
  );
}
