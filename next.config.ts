import type { NextConfig } from 'next';

// OPS_API_URL is read when the config loads (dev start / build): change it, then restart or rebuild.
const apiUrl = process.env.OPS_API_URL ?? 'http://localhost:4010';

const nextConfig: NextConfig = {
  turbopack: {
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
