import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { validateEnvironment } from "@/lib/env-check";
import { Providers } from "@/providers";

import "@/styles/globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

// Validate environment on app startup
validateEnvironment();

export const metadata: Metadata = {
  title: "YM Movement",
  description: "Professional skating lesson scheduling platform",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YM Movement",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <Providers>
          {children}
          {/* Development performance monitor */}
          {process.env.NODE_ENV === "development" && <div id="performance-monitor-root" />}
        </Providers>
      </body>
    </html>
  );
}
