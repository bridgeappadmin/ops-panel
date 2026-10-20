import { GOOGLE_HOST, parseMapsLink } from './mapsLink';

const MAX_HOPS = 5;
const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);

/** Its message is safe to show the user. Anything else thrown here is turned into one of these. */
export class MapsResolveError extends Error {}
const refuse = (message: string) => new MapsResolveError(message);

/** https on a Google host, nothing else (consent.google.com is only ever read for its `continue`, never fetched). */
function allowed(u: URL): boolean {
  return u.protocol === 'https:' && (SHORT_HOSTS.has(u.hostname) || GOOGLE_HOST.test(u.hostname) || u.hostname === 'consent.google.com');
}

/**
 * Expands a Google Maps short link by following its redirects by hand: https and a Google host on every hop,
 * at most 5 fetches, `timeoutMs` overall. Never fetches another host and never returns a body, only the final
 * Google Maps URL (one that parseMapsLink accepts).
 */
export async function resolveShortMapsLink(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 5000): Promise<string> {
  let current: URL;
  try { current = new URL(url); } catch { throw refuse('That is not a link.'); }
  if (!allowed(current)) throw refuse('Only Google Maps links can be opened.');

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    for (let hops = 0; ; hops++) {
      if (parseMapsLink(current.href)) return current.href;
      if (hops >= MAX_HOPS) throw refuse('That link redirects too many times.');
      let res: Response;
      try {
        res = await fetchImpl(current.href, { redirect: 'manual', signal: ctl.signal });
      } catch {
        throw refuse(ctl.signal.aborted ? 'Google took too long to answer. Try again.' : 'Could not open that link.');
      }
      void res.body?.cancel().catch(() => {}); // the body is never read
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!location) throw refuse('That link does not lead to a Google Maps place.');
      let next: URL;
      try { next = new URL(location, current); } catch { throw refuse('That link does not lead to a Google Maps place.'); }
      if (next.hostname === 'consent.google.com') {
        // The cookie-consent page: its `continue` parameter is where we were going.
        try { next = new URL(next.searchParams.get('continue') ?? ''); } catch { throw refuse('That link does not lead to a Google Maps place.'); }
      }
      if (!allowed(next) || next.hostname === 'consent.google.com') throw refuse('That link leads somewhere other than Google Maps.');
      current = next;
    }
  } finally {
    clearTimeout(timer);
  }
}
