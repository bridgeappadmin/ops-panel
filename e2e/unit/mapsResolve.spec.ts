import { expect, test } from '@playwright/test';
import { resolveShortMapsLink } from '../../src/lib/mapsResolve';

const LONG = 'https://www.google.com/maps/place/Cafe/@12.97,77.59,17z/data=!3d12.97!4d77.59';
const redirect = (to: string, status = 302) => new Response(null, { status, headers: { location: to } });

/** A fake fetch answering from a table; records what it was asked. */
function fake(table: Record<string, () => Response>) {
  const asked: string[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    asked.push(url);
    expect(init?.redirect).toBe('manual');
    const h = table[url];
    if (!h) throw new Error(`unexpected fetch ${url}`);
    return h();
  }) as typeof fetch;
  return { impl, asked };
}

test('follows two hops to a google.com/maps URL', async () => {
  const f = fake({
    'https://maps.app.goo.gl/abc': () => redirect('https://goo.gl/maps/xyz'),
    'https://goo.gl/maps/xyz': () => redirect(LONG),
  });
  expect(await resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).toBe(LONG);
  expect(f.asked).toEqual(['https://maps.app.goo.gl/abc', 'https://goo.gl/maps/xyz']);
});

test('resolves a relative Location', async () => {
  const f = fake({
    'https://maps.app.goo.gl/abc': () => redirect('/next'),
    'https://maps.app.goo.gl/next': () => redirect(LONG),
  });
  expect(await resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).toBe(LONG);
});

test('refuses a hop to a non-Google host before fetching it', async () => {
  const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect('https://evil.example/maps/@1,2,3z') });
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).rejects.toThrow();
  expect(f.asked).toEqual(['https://maps.app.goo.gl/abc']);
});

test('refuses lookalike hosts', async () => {
  const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect('https://google.com.evil.example/x') });
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).rejects.toThrow();
  expect(f.asked).toHaveLength(1);
});

test('refuses a non-https hop', async () => {
  const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect('http://www.google.com/maps/@1,2,3z') });
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).rejects.toThrow();
  expect(f.asked).toHaveLength(1);
});

test('refuses a non-https or non-Google start', async () => {
  const f = fake({});
  await expect(resolveShortMapsLink('http://maps.app.goo.gl/abc', f.impl)).rejects.toThrow();
  await expect(resolveShortMapsLink('https://evil.example/abc', f.impl)).rejects.toThrow();
  expect(f.asked).toEqual([]);
});

test('refuses more than 5 hops', async () => {
  let n = 0;
  const impl = (async () => { n++; return redirect(`https://maps.app.goo.gl/h${n}`); }) as typeof fetch;
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/h0', impl)).rejects.toThrow(/too many/i);
  expect(n).toBe(5);
});

test('fails on a non-redirect that is not a maps URL, without returning the body', async () => {
  const f = fake({ 'https://maps.app.goo.gl/abc': () => new Response('<html>secret body</html>', { status: 200 }) });
  const err = await resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl).catch((e: Error) => e);
  expect(err).toBeInstanceOf(Error);
  expect((err as Error).message).not.toContain('secret');
});

test('times out', async () => {
  const impl = ((_u: unknown, init?: RequestInit) => new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))) as typeof fetch;
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', impl, 100)).rejects.toThrow();
});

test('reads the continue parameter of a consent page without fetching it', async () => {
  const consent = `https://consent.google.com/m?continue=${encodeURIComponent(LONG)}&gl=DE`;
  const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect(consent) });
  expect(await resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).toBe(LONG);
  expect(f.asked).toHaveLength(1);
});

test('refuses a consent page that continues to another host', async () => {
  const consent = `https://consent.google.com/m?continue=${encodeURIComponent('https://evil.example/x')}`;
  const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect(consent) });
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).rejects.toThrow();
  expect(f.asked).toHaveLength(1);
});

test('refuses a hop to a non-default port before fetching it', async () => {
  const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect('https://www.google.com:22/x') });
  await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl)).rejects.toThrow();
  expect(f.asked).toHaveLength(1);
});

test('refuses lookalike TLDs', async () => {
  for (const host of ['www.google.com.xyz', 'www.google.co.com', 'maps.google.top']) {
    const f = fake({ 'https://maps.app.goo.gl/abc': () => redirect(`https://${host}/maps/x`) });
    await expect(resolveShortMapsLink('https://maps.app.goo.gl/abc', f.impl), host).rejects.toThrow();
    expect(f.asked).toHaveLength(1);
  }
});

test('refuses a consent page as the start URL, without fetching it', async () => {
  const f = fake({});
  await expect(resolveShortMapsLink(`https://consent.google.com/m?continue=${encodeURIComponent(LONG)}`, f.impl)).rejects.toThrow();
  expect(f.asked).toEqual([]);
});
