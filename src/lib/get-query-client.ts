// src/lib/get-query-client.ts
//
// Returns a QueryClient for server-side prefetching. Each request gets a
// fresh instance — the React Query docs are explicit that you must NOT
// share a QueryClient across requests on the server (data leakage). On the
// client we re-use the singleton from the Providers component.
//
// This is the canonical pattern from
// https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr

import "server-only";

import { QueryClient } from "@tanstack/react-query";

export function getQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Match the client's stale time so prefetched data isn't immediately
        // considered stale on hydration (which would re-fire the request).
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}
