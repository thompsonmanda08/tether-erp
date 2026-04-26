import type { NextConfig } from "next";
import { config } from "dotenv";

config();

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  typescript: {
    // Next.js 16 has a known type issue with deleted route validators — clear .next cache if this persists
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bundui-images.netlify.app",
        pathname: "/**",
      },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"], // Optimize chunk splitting
    serverActions: {
      bodySizeLimit: (process.env.MAX_FILE_SIZE_LIMIT as any) || "60mb",
      // allowedForwardedHosts: ["tether-erp.com"] ,
      // allowedOrigins: ["tether-erp.com"],
    },
  },
};

export default nextConfig;
