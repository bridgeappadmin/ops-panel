export interface MapsPlace { lat: number; lng: number; name?: string; exact: boolean }

/** google.<tld>, www.google.<tld>, maps.google.<tld>: com, co.in, com.au, de… (never google.com.evil.example). */
export const GOOGLE_HOST = /^(?:(?:www|maps)\.)?google\.(?:com?\.)?[a-z]{2,3}$/;
const NUM = '-?\\d+(?:\\.\\d+)?';
const PAIR = new RegExp(`^\\s*(${NUM})\\s*,[\\s+]*(${NUM})\\s*$`);

const pair = (text: string | null | undefined): [number, number] | null => {
  const m = text ? PAIR.exec(text) : null;
  return m ? [Number(m[1]), Number(m[2])] : null;
};
const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** A full Google Maps URL -> the place's location, or null. `exact` is false when only the map's centre is known. */
export function parseMapsLink(url: string): MapsPlace | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || !GOOGLE_HOST.test(u.hostname)) return null;
  const onMapsHost = u.hostname.startsWith('maps.');
  if (!onMapsHost && !/^\/maps(\/|$)/.test(u.pathname)) return null;

  const path = safeDecode(u.pathname);
  const seg = /\/maps\/place\/([^/]+)/.exec(u.pathname)?.[1];
  const segText = seg === undefined ? undefined : safeDecode(seg).replace(/\+/g, ' ');
  const name = segText && !pair(segText) ? segText : undefined;

  const pin = new RegExp(`!3d(${NUM})!4d(${NUM})`).exec(path);
  const q = u.searchParams;
  const explicit =
    (pin ? ([Number(pin[1]), Number(pin[2])] as [number, number]) : null) ??
    pair(q.get('q')) ?? pair(q.get('query')) ?? pair(q.get('ll')) ??
    pair(/\/maps\/(?:search|place)\/([^/]+)/.exec(path)?.[1]);
  const centre = explicit ? null : new RegExp(`/@(${NUM}),(${NUM})`).exec(path);
  const found = explicit ?? (centre ? ([Number(centre[1]), Number(centre[2])] as [number, number]) : null);
  if (!found) return null;

  const [lat, lng] = found;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, ...(name ? { name } : {}), exact: !!explicit };
}

/** https://maps.app.goo.gl/… or https://goo.gl/maps/… : must be expanded server-side. */
export function isShortMapsLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'maps.app.goo.gl' || (u.hostname === 'goo.gl' && u.pathname.startsWith('/maps/')));
  } catch { return false; }
}
