/** @type {import('next').NextConfig} */
import BundleAnalyzer from "@next/bundle-analyzer";

// Optional bundle analyzer setup
const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: true,
  // Note: "standalone" output removed — Netlify uses its own adapter via @netlify/plugin-nextjs.
  // For Docker, set NEXT_OUTPUT=standalone in the Docker build environment if needed.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
  compiler: {
    removeConsole: false, // Keep all console logs temporarily
  },
  // Security configuration for CVE-2025-48068
  allowedDevOrigins: process.env.NODE_ENV === "development" ? ["localhost"] : [],
  typescript: {
    // Type-check locally with `pnpm type-check`. CI build servers may not have enough heap for tsc.
    ignoreBuildErrors: process.env.NETLIFY === "true" || process.env.VERCEL === "1",
  },
  turbopack: {},
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-tabs",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
      "lucide-react",
      "@/components/ui",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 60, // Cache images for 1 minute minimum
  },
  // PWA and Service Worker configuration
  async rewrites() {
    return [
      {
        source: "/sw.js",
        destination: "/sw.js",
      },
      {
        source: "/offline.html",
        destination: "/offline.html",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.googletagmanager.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://accounts.google.com https://api.resend.com https://vitals.vercel-insights.com https://challenges.cloudflare.com; frame-src https://accounts.google.com https://challenges.cloudflare.com https://www.youtube.com https://youtube.com; object-src 'none'; base-uri 'self'; form-action 'self'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests;",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Note: Cross-Origin-Embedder-Policy removed to allow YouTube embeds
          // COEP blocks third-party content that doesn't explicitly opt-in via CORP headers
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === "production" ? (process.env.NEXTAUTH_URL || "https://ym-movement.com") : "http://localhost:3100",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

// Export with bundle analyzer for production builds
export default process.env.NODE_ENV === "production" ? withBundleAnalyzer(nextConfig) : nextConfig;
