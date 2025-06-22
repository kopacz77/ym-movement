// src/app/layout.tsx
import "@/styles/globals.css";

import { cn } from "@/lib/utils";
import { Providers } from "@/providers";
import { Suspense } from "react";
import { Toaster } from "sonner";

export const metadata = {
  title: "YM Movement - Skating Coach Scheduling",
  description: "A scheduling app for skating coach Yura Min",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <Providers>
          <Suspense>{children}</Suspense>
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
