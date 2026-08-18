import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/auth/:path*',
        destination: `${backendUrl}/api/auth/:path*`,
      },
      {
        source: '/api/repositories/:path*',
        destination: `${backendUrl}/api/repositories/:path*`,
      },
      {
        source: '/api/workspaces/:path*',
        destination: `${backendUrl}/api/workspaces/:path*`,
      },
      {
        source: '/api/upload/:path*',
        destination: `${backendUrl}/api/upload/:path*`,
      },
    ];
  },
};

export default nextConfig;
