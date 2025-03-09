// src/providers/index.tsx
'use client';
import * as React from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { api } from '@/lib/api';
import superjson from 'superjson';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
// Remove this: import { Toaster } from '@/components/ui/toaster';
// The Toaster will now be in the layout file directly

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  const [trpcClient] = useState(() => api.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  }));

  return (
    <SessionProvider>
      <AuthProvider>
        <api.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {children}
            {/* Remove this: <Toaster /> */}
          </QueryClientProvider>
        </api.Provider>
      </AuthProvider>
    </SessionProvider>
  );
}