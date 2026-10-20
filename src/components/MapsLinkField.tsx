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
  const done = useRef<{ text: string; place: MapsPlace } | null>(null); // the link last applied
  const pending = useRef(''); // a short link being resolved: paste and blur both report it
  const latest = useRef(0); // ignores an answer that a newer link has overtaken

  const at = parseCoords(coords);
  const inForce = (text: string) => {
    const d = done.current;
    return !!d && d.text === text && !!at && at.lat === d.place.lat && at.lng === d.place.lng;
  };

  /** Short links go to the server, so only on paste or blur (`resolveShort`), never on every keystroke. */
  async function read(raw: string, resolveShort: boolean) {
    const text = raw.trim();
    if (inForce(text) || (text && pending.current === text)) return; // anything else, including a failed or overridden link, is read again
    let found = parseMapsLink(text);
    const short = !found && isShortMapsLink(text);
    if (short && !resolveShort) return;
    const n = ++latest.current;
    pending.current = '';
    done.current = null;
    setError('');
    if (!text) { setPlace(null); return; }
    if (short) {
      pending.current = text;
      try {
        const res = await fetch(`/maps-link?url=${encodeURIComponent(text)}`);
        const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
        if (!res.ok || !body.url) throw new Error(body.message || 'Could not open that link.');
        found = parseMapsLink(body.url);
      } catch (e) {
        if (n === latest.current) { pending.current = ''; setPlace(null); setError((e as Error).message); }
        return;
      }
      if (n === latest.current) pending.current = '';
    }
    if (n !== latest.current) return;
    setPlace(found);
    if (found) { done.current = { text, place: found }; onPlace(found); } else setError(NOT_A_PLACE);
  }

  const fromLink = place && at && at.lat === place.lat && at.lng === place.lng ? place : null;

  return (
    <div className="space-y-3">
      <Field
        label="Google Maps link"
        placeholder="https://maps.app.goo.gl/…"
        value={link}
        error={error}
        onChange={(e) => { setLink(e.target.value); void read(e.target.value, false); }}
        onPaste={(e) => void read(e.clipboardData.getData('text'), true)}
        onBlur={(e) => void read(e.target.value, true)}
      />
      {at ? (
        <div className="space-y-2">
          {fromLink?.name ? <p className="text-body-sb">{fromLink.name}</p> : null}
          <p className="text-body text-ink-muted">{at.lat}, {at.lng}</p>
          {fromLink && !fromLink.exact ? (
            <p className="rounded-md bg-warning/14 px-3 py-2 text-caption text-ink">
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
