// src/providers/index.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { SessionProvider } from "next-auth/react";
import type * as React from "react";
import { useState } from "react";
import superjson from "superjson";
import { AuthProvider } from "@/contexts/AuthContext";
import { BulkOperationsProvider } from "@/contexts/BulkOperationsContext"; // Add this import
import { api } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <SessionProvider>
      <AuthProvider>
        <BulkOperationsProvider>
          {" "}
          {/* Add this provider */}
          <api.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </api.Provider>
        </BulkOperationsProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
