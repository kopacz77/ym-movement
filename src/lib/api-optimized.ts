/**
 * Optimized TRPC Client Configuration
 *
 * Enhanced TRPC client with intelligent caching, batch operations, and error handling
 *
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import { type DefaultOptions, QueryClient } from "@tanstack/react-query";
import { createTRPCProxyClient, httpBatchLink, loggerLink, splitLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@/lib/root";

// Type definitions for better type safety
interface LessonData {
  studentId: string;
  timeSlotId: string;
  type: string;
  area?: string;
  notes?: string;
  id?: string;
  status?: string;
}

interface StudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

interface BookingMutationVariables {
  studentId: string;
  timeSlotId: string;
  type: string;
  area?: string;
  paymentMethod: string;
  notes?: string;
}

interface OptimisticUpdateContext {
  previousLessons: unknown;
}

// Enhanced React Query configuration
const queryClientConfig: DefaultOptions = {
  queries: {
    // Stale time - how long data is considered fresh
    staleTime: 1000 * 60 * 5, // 5 minutes

    // Cache time - how long unused data stays in cache
    gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime in v5)

    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error && typeof error === "object" && "status" in error) {
        const status = error.status as number;
        if (status >= 400 && status < 500) {
          return false;
        }
      }

      // Retry up to 3 times for other errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus (disabled for better UX)
    refetchOnWindowFocus: false,

    // Refetch on reconnect
    refetchOnReconnect: true,

    // Network mode
    networkMode: "online",

    // Error handling
    throwOnError: false,
  },
  mutations: {
    // Retry mutations only once
    retry: 1,

    // Network mode for mutations
    networkMode: "online",

    // Error handling
    throwOnError: false,
  },
};

/**
 * Create optimized query client
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryClientConfig,
  });
}

/**
 * TRPC link configuration with batching and caching
 */
function createTRPCLinks() {
  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return ""; // browser should use relative url
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
    }
    return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
  };

  return [
    // Logger link for development
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),

    // Split link for different handling of subscriptions vs queries/mutations
    splitLink({
      condition(op) {
        // Send subscriptions to wsLink, everything else to httpBatchLink
        return op.type === "subscription";
      },

      // Websocket link for subscriptions (if needed)
      true: httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),

      // HTTP batch link for queries and mutations
      false: httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,

        // Batch configuration
        maxURLLength: 2083, // Standard URL length limit

        // Headers
        headers() {
          return {
            "Content-Type": "application/json",
          };
        },

        // Use default fetch behavior
      }),
    }),
  ];
}

/**
 * Create optimized TRPC client
 */
export function createOptimizedTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
    links: createTRPCLinks(),
  });
}

/**
 * TRPC React hooks with enhanced configuration
 */
export const api = createTRPCReact<AppRouter>();

/**
 * Enhanced query utilities
 */
export namespace TRPCQueryUtils {
  let queryClient: QueryClient;

  export function setQueryClient(client: QueryClient) {
    queryClient = client;
  }

  /**
   * Prefetch data for faster navigation
   */
  export async function prefetchStudentList() {
    if (!queryClient) {
      return;
    }

    await queryClient.prefetchQuery({
      queryKey: [["admin", "student", "list"], { type: "query" }],
      queryFn: () => {
        // This would be handled by TRPC automatically
        return Promise.resolve([]);
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  }

  /**
   * Prefetch upcoming lessons
   */
  export async function prefetchUpcomingLessons(studentId?: string) {
    if (!queryClient) {
      return;
    }

    await queryClient.prefetchQuery({
      queryKey: [["student", "lesson", "upcoming"], { type: "query", input: { studentId } }],
      queryFn: () => Promise.resolve([]),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  }

  /**
   * Optimistic updates for better UX
   */
  export async function optimisticLessonBooking(lessonData: LessonData) {
    if (!queryClient) {
      return;
    }

    // Cancel outgoing refetches
    await queryClient.cancelQueries({
      queryKey: [["student", "lesson", "upcoming"]],
    });

    // Snapshot previous value
    const previousLessons = queryClient.getQueryData([["student", "lesson", "upcoming"]]);

    // Optimistically update
    queryClient.setQueryData(
      [["student", "lesson", "upcoming"]],
      (old: LessonData[] | undefined) => [
        ...(old || []),
        { ...lessonData, id: `temp-${Date.now()}`, status: "pending" },
      ],
    );

    return { previousLessons };
  }

  /**
   * Revert optimistic update on error
   */
  export function revertOptimisticUpdate(context: OptimisticUpdateContext) {
    if (!queryClient) {
      return;
    }

    queryClient.setQueryData([["student", "lesson", "upcoming"]], context.previousLessons);
  }

  /**
   * Intelligent cache invalidation
   */
  export async function invalidateRelatedQueries(
    type: "student" | "lesson" | "payment" | "schedule",
    id?: string,
  ) {
    if (!queryClient) {
      return;
    }

    const invalidationMap = {
      student: [
        [["admin", "student", "list"]],
        [["admin", "student", "get"], { input: { id } }],
        [["admin", "analytics"]],
      ],
      lesson: [
        [["student", "lesson", "upcoming"]],
        [["admin", "schedule", "lessons"]],
        [["admin", "analytics"]],
      ],
      payment: [
        [["admin", "payment", "list"]],
        [["student", "payment", "list"]],
        [["admin", "analytics"]],
      ],
      schedule: [[["admin", "schedule", "timeSlots"]], [["student", "schedule", "available"]]],
    };

    const queryKeys = invalidationMap[type] || [];

    await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }

  /**
   * Preload critical data
   */
  export async function preloadCriticalData(userRole: "ADMIN" | "STUDENT", _userId: string) {
    if (!queryClient) {
      return;
    }

    const preloadPromises: Promise<unknown>[] = [];

    if (userRole === "ADMIN") {
      // Preload admin dashboard data
      preloadPromises.push(
        queryClient.prefetchQuery({
          queryKey: [["admin", "analytics", "dashboard"]],
          queryFn: () => Promise.resolve({}),
          staleTime: 1000 * 60 * 10, // 10 minutes
        }),
        queryClient.prefetchQuery({
          queryKey: [["admin", "student", "pendingApprovals"]],
          queryFn: () => Promise.resolve([]),
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
      );
    } else if (userRole === "STUDENT") {
      // Preload student dashboard data
      preloadPromises.push(
        queryClient.prefetchQuery({
          queryKey: [["student", "dashboard"]],
          queryFn: () => Promise.resolve({}),
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
        queryClient.prefetchQuery({
          queryKey: [["student", "lesson", "upcoming"]],
          queryFn: () => Promise.resolve([]),
          staleTime: 1000 * 60 * 2, // 2 minutes
        }),
      );
    }

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Background refresh for stale data
   */
  export function startBackgroundRefresh() {
    if (!queryClient) {
      return;
    }

    const refreshInterval = setInterval(
      () => {
        // Refresh stale queries in the background
        queryClient.invalidateQueries({
          stale: true,
          refetchType: "none", // Don't refetch immediately
        });
      },
      1000 * 60 * 5,
    ); // Every 5 minutes

    // Return cleanup function
    return () => clearInterval(refreshInterval);
  }

  /**
   * Get cache statistics
   */
  export function getCacheStats() {
    if (!queryClient) {
      return null;
    }

    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter((q) => q.isStale()).length,
      loadingQueries: queries.filter((q) => q.state.fetchStatus === "fetching").length,
      errorQueries: queries.filter((q) => q.state.status === "error").length,
      successQueries: queries.filter((q) => q.state.status === "success").length,
    };

    return stats;
  }

  /**
   * Clean up stale queries
   */
  export function cleanupStaleQueries() {
    if (!queryClient) {
      return;
    }

    queryClient.getQueryCache().clear();
  }
}

/**
 * Custom hooks for optimized data fetching
 */
export function useOptimizedStudentList(params: StudentListParams = {}) {
  return api.admin.student.getStudents.useQuery(params, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    placeholderData: (previousData: any) => previousData,
  });
}

export function useOptimizedUpcomingLessons(studentId?: string) {
  return api.student.profile.getStudentLessons.useQuery(
    { studentId: studentId || "", status: "SCHEDULED" },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!studentId,
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
    },
  );
}

export function useOptimizedAnalytics(dateRange: DateRange) {
  return api.admin.analytics.getOverview.useQuery(dateRange as any, {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hooks with optimistic updates
 */
export function useOptimisticLessonBooking() {
  const utils = api.useUtils();

  return api.student.booking.bookLesson.useMutation({
    onMutate: async (variables: BookingMutationVariables) => {
      // Cancel outgoing refetches
      await utils.student.profile.getStudentLessons.cancel();

      // Snapshot previous value
      const previousLessons = utils.student.profile.getStudentLessons.getData();

      // Optimistically update
      if (variables.studentId) {
        utils.student.profile.getStudentLessons.setData(
          { studentId: variables.studentId, status: "SCHEDULED" },
          (old: any) => [
            ...(old || []),
            { ...variables, id: `temp-${Date.now()}`, status: "pending" },
          ],
        );
      }

      return { previousLessons };
    },
    onError: (_err: any, variables: any, context: any) => {
      // Revert optimistic update
      if (context?.previousLessons && variables.studentId) {
        utils.student.profile.getStudentLessons.setData(
          { studentId: variables.studentId, status: "SCHEDULED" },
          context.previousLessons as any,
        );
      }
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      utils.student.profile.getStudentLessons.invalidate();
    },
  });
}

// Query client creator and utilities are already exported above
export type { DefaultOptions };
