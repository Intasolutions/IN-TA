import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "in-tasolutions.com",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "www.in-tasolutions.com",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  /* async rewrites() {
    return [
      {
        // When you fetch('/api/...') locally, it goes to your EC2 backend
        source: '/api/:path*',
        destination: 'https://in-tasolutions.com/api/:path*',
      },
      {
        // When you load images from /media/... locally, it grabs them from EC2
        source: '/media/:path*',
        destination: 'https://in-tasolutions.com/media/:path*',
      },
    ];
  }, */
};

export default nextConfig;