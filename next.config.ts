import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; raised to fit meal photos (capped at 8MB in the action itself).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
