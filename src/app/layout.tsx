import '@/styles/globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';

// Modern font loading
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
      </body>
    </html>
  );
}