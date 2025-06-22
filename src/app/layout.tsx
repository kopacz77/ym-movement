import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/lib/trpc/react";

import "@/styles/globals.css";

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
        <TRPCReactProvider>
          {children}
          {/* Development performance monitor */}
          {process.env.NODE_ENV === 'development' && (
            <div id="performance-monitor-root" />
          )}
        </TRPCReactProvider>
      </body>
    </html>
  );
}