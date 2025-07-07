import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { Providers } from "@/providers";
import { validateEnvironment } from "@/lib/env-check";

import "@/styles/globals.css";

// Validate environment on app startup
validateEnvironment();

export const metadata: Metadata = {
  title: "Yura Scheduler",
  description: "Professional skating lesson scheduling platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <Providers>
          {children}
          {/* Development performance monitor */}
          {process.env.NODE_ENV === 'development' && (
            <div id="performance-monitor-root" />
          )}
        </Providers>
      </body>
    </html>
  );
}