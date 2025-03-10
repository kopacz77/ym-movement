// src/app/layout.tsx
import '@/styles/globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import { ThemeProvider } from 'next-themes';
import { Toaster } from "@/components/ui/sonner"; // Add this import

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster /> {/* Add this component */}
      </body>
    </html>
  );
}