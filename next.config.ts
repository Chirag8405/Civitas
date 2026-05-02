import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

export default nextConfig;
