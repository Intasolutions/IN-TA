import type { NextConfig } from "next";

// The API this build talks to (the same fallback as the pages use)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// A backend on this computer (development and local test builds); the live site uses Render's API and Cloudinary
const LOCAL_API = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(API_URL);

const nextConfig: NextConfig = {
  // no "X-Powered-By: Next.js" header: it only tells the world what the site runs on
  poweredByHeader: false,
  images: {
    qualities: [75, 90],
    // Next 16 won't optimise images from this computer's own addresses unless told to: only when the backend is a
    // local one. The live site keeps the guard, and doesn't list the local addresses at all.
    dangerouslyAllowLocalIP: LOCAL_API,
    remotePatterns: [
      ...(LOCAL_API
        ? [
            { protocol: "http" as const, hostname: "127.0.0.1", port: "8000", pathname: "/media/**" },
            { protocol: "http" as const, hostname: "localhost", port: "8000", pathname: "/media/**" },
          ]
        : []),
      // everything uploaded in the admin lives on Cloudinary
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        // Standard protection on every page. The site uses the clipboard (copy buttons) and the device's tilt (the
        // home page), so those stay; nothing asks for the camera, microphone, location or payments.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
      {
        // The About page's satellite imagery, fetched by script: a returning visitor keeps it for a week instead of
        // asking about every image again. Replacing one? Give it a new name too, or some visitors keep the old one a week.
        source: "/about/earth/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
