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
    // next dev writes an AGENTS.md when it detects a coding agent; this repo doesn't keep one.
    agentRules: false,
    turbopack: {
      rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
    },
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
    },
    // No page may be framed (clickjacking): the old portal had this from helmet.
    async headers() {
      return [{
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      }];
    },
  };
}
