import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: temporarily ignore ESLint during production builds so we can generate
  // a Vercel-compatible build quickly. This should be removed and lints fixed
  // before final production deployment.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
