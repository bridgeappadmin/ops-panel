import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

// OPS_API_URL is read when the config loads (dev start / build): change it, then restart or rebuild. A trailing
// slash would make every call '//admin/...', which the server 404s.
const apiUrl = (process.env.OPS_API_URL || 'http://localhost:4010').replace(/\/+$/, '');

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && !process.env.OPS_API_URL) {
    console.warn(`\n⚠ OPS_API_URL is not set: /api goes to ${apiUrl}. Set it before building for any other server.\n`);
  }
  return {
    // The browser posts the sign-in straight to the API (see login() in lib/api.ts).
    env: { NEXT_PUBLIC_API_URL: apiUrl },
    // next dev writes an AGENTS.md when it detects a coding agent; this repo doesn't keep one.
    agentRules: false,
    turbopack: {
      rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
    },
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
    },
    // No page may be framed (clickjacking), and pages only talk to this app and, for the sign-in, the API (OPS-4).
    // ponytail: no script-src: Next's inline bootstrap scripts need a per-request nonce (middleware). Add one if
    // the panel ever renders HTML it didn't write.
    async headers() {
      return [{
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy', value: `frame-ancestors 'none'; connect-src 'self' ${apiUrl}; object-src 'none'; base-uri 'self'; form-action 'self'` },
        ],
      }];
    },
  };
}
