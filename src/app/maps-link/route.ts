import { isShortMapsLink } from '@/lib/mapsLink';
import { MapsResolveError, resolveShortMapsLink } from '@/lib/mapsResolve';

// Not under /api: next.config.ts rewrites that to the Tazmify server. Unauthenticated, which is safe: it only
// fetches Google hosts (see mapsResolve) and returns just the final URL.
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url') ?? '';
  if (!isShortMapsLink(url)) return Response.json({ message: 'Paste a Google Maps short link (maps.app.goo.gl).' }, { status: 400 });
  try {
    return Response.json({ url: await resolveShortMapsLink(url) });
  } catch (e) {
    return Response.json({ message: e instanceof MapsResolveError ? e.message : 'Could not open that link.' }, { status: 400 });
  }
}
