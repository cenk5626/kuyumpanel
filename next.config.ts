import type { NextConfig } from "next";

const productionOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://kuyumpanel-tau.vercel.app';

const nextConfig: NextConfig = {
  env: {
    // Prevent NextAuth from falling back to ephemeral VERCEL_URL deployment hashes
    ...(process.env.NODE_ENV === 'production' && !process.env.AUTH_URL && !process.env.NEXTAUTH_URL
      ? {
          AUTH_URL: productionOrigin,
          NEXTAUTH_URL: productionOrigin,
        }
      : {}),
  },
};

export default nextConfig;
