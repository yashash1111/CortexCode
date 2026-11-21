import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/auth/:path*',
        destination: `${backendUrl}/api/auth/:path*`,
      },
      {
        source: '/api/profile/:path*',
        destination: `${backendUrl}/api/profile/:path*`,
      },
      {
        source: '/api/profile',
        destination: `${backendUrl}/api/profile`,
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
      {
        source: '/api/jobs/:path*',
        destination: `${backendUrl}/api/jobs/:path*`,
      },
      {
        source: '/api/docs/:path*',
        destination: `${backendUrl}/api/docs/:path*`,
      },
      {
        source: '/api/github/:path*',
        destination: `${backendUrl}/api/github/:path*`,
      },
      {
        source: '/api/github-intel/:path*',
        destination: `${backendUrl}/api/github-intel/:path*`,
      },
      {
        source: '/api/backend-health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
