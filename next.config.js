/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";
import BundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Optional bundle analyzer setup
const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["@/components/ui"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(__dirname, "src"),
    };
    return config;
  },
};

// Export with bundle analyzer for production builds
export default process.env.NODE_ENV === "production"
  ? withBundleAnalyzer(nextConfig)
  : nextConfig;