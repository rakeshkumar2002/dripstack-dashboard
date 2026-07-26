/** @type {import('next').NextConfig} */
const nextConfig = {
  // Traces only the reachable files into a self-contained server.js, so the
  // runtime image doesn't have to carry all of node_modules.
  output: 'standalone',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async redirects() {
    // The docs site lives in public/docs/. Next doesn't resolve a directory
    // index under public/, so a bare /docs would 404.
    return [{ source: '/docs', destination: '/docs/index.html', permanent: false }];
  },
};
export default nextConfig;
