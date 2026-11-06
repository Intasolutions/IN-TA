import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90],
    remotePatterns: [
      // a backend running on this computer, while developing
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/media/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
      // everything uploaded in the admin lives on Cloudinary
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
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
