import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The raw Vercel domain must not get indexed as a duplicate —
      // permanently redirect everything to the canonical subdomain.
      {
        source: "/:path*",
        has: [{ type: "host", value: "hive-mind-two.vercel.app" }],
        destination: "https://hivemind.rianfernando.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
