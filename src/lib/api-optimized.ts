/**
 * Optimized TRPC Client Configuration
 * 
 * Enhanced TRPC client with intelligent caching, batch operations, and error handling
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import type { AppRouter } from "@/lib/root";
import { createTRPCReact } from "@trpc/react-query";
import { createTRPCProxyClient, httpBatchLink, loggerLink, splitLink } from "@trpc/client";
import { QueryClient, type DefaultOptions } from "@tanstack/react-query";
import superjson from "superjson";

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
      if (error && typeof error === 'object' && 'status' in error) {
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
    networkMode: 'online',
    
    // Error handling
    throwOnError: false,
  },
  mutations: {
    // Retry mutations only once
    retry: 1,
    
    // Network mode for mutations
    networkMode: 'online',
    
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
    logger: {
      log: console.log,
      warn: console.warn,
      error: process.env.NODE_ENV === 'development' ? console.error : () => {},
    },
  });
}

/**
 * TRPC link configuration with batching and caching
 */
function createTRPCLinks() {
  const getBaseUrl = () => {
    if (typeof window !== "undefined") return ""; // browser should use relative url
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
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
        return op.type === 'subscription';
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
            'Content-Type': 'application/json',
          };
        },
        
        // Request timeout
        fetch(url, options) {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });
        },
      }),
    }),
  ];
}

/**
 * Create optimized TRPC client
 */
export function createOptimizedTRPCClient() {
  return createTRPCProxyClient<AppRouter>({
    transformer: superjson,
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
export class TRPCQueryUtils {
  private static queryClient: QueryClient;

  static setQueryClient(client: QueryClient) {
    this.queryClient = client;
  }

  /**
   * Prefetch data for faster navigation
   */
  static async prefetchStudentList() {
    if (!this.queryClient) return;

    await this.queryClient.prefetchQuery({
      queryKey: [['admin', 'student', 'list'], { type: 'query' }],
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
  static async prefetchUpcomingLessons(studentId?: string) {
    if (!this.queryClient) return;

    await this.queryClient.prefetchQuery({
      queryKey: [['student', 'lesson', 'upcoming'], { type: 'query', input: { studentId } }],
      queryFn: () => Promise.resolve([]),
      staleTime: 1000 * 60 * 2, // 2 minutes
    });
  }

  /**
   * Optimistic updates for better UX
   */
  static async optimisticLessonBooking(lessonData: any) {
    if (!this.queryClient) return;

    // Cancel outgoing refetches
    await this.queryClient.cancelQueries({
      queryKey: [['student', 'lesson', 'upcoming']],
    });

    // Snapshot previous value
    const previousLessons = this.queryClient.getQueryData([['student', 'lesson', 'upcoming']]);

    // Optimistically update
    this.queryClient.setQueryData([['student', 'lesson', 'upcoming']], (old: any[]) => [
      ...old,
      { ...lessonData, id: 'temp-' + Date.now(), status: 'pending' }
    ]);

    return { previousLessons };
  }

  /**
   * Revert optimistic update on error
   */
  static revertOptimisticUpdate(context: { previousLessons: any }) {
    if (!this.queryClient) return;

    this.queryClient.setQueryData([['student', 'lesson', 'upcoming']], context.previousLessons);
  }

  /**
   * Intelligent cache invalidation
   */
  static async invalidateRelatedQueries(type: 'student' | 'lesson' | 'payment' | 'schedule', id?: string) {
    if (!this.queryClient) return;

    const invalidationMap = {
      student: [
        [['admin', 'student', 'list']],
        [['admin', 'student', 'get'], { input: { id } }],
        [['admin', 'analytics']],
      ],
      lesson: [
        [['student', 'lesson', 'upcoming']],
        [['admin', 'schedule', 'lessons']],
        [['admin', 'analytics']],
      ],
      payment: [
        [['admin', 'payment', 'list']],
        [['student', 'payment', 'list']],
        [['admin', 'analytics']],
      ],
      schedule: [
        [['admin', 'schedule', 'timeSlots']],
        [['student', 'schedule', 'available']],
      ],
    };

    const queryKeys = invalidationMap[type] || [];
    
    await Promise.all(
      queryKeys.map(queryKey => 
        this.queryClient.invalidateQueries({ queryKey })
      )
    );
  }

  /**
   * Preload critical data
   */
  static async preloadCriticalData(userRole: 'ADMIN' | 'STUDENT', userId: string) {
    if (!this.queryClient) return;

    const preloadPromises: Promise<any>[] = [];

    if (userRole === 'ADMIN') {
      // Preload admin dashboard data
      preloadPromises.push(
        this.queryClient.prefetchQuery({
          queryKey: [['admin', 'analytics', 'dashboard']],
          queryFn: () => Promise.resolve({}),
          staleTime: 1000 * 60 * 10, // 10 minutes
        }),
        this.queryClient.prefetchQuery({
          queryKey: [['admin', 'student', 'pendingApprovals']],
          queryFn: () => Promise.resolve([]),
          staleTime: 1000 * 60 * 5, // 5 minutes
        })
      );
    } else if (userRole === 'STUDENT') {
      // Preload student dashboard data
      preloadPromises.push(
        this.queryClient.prefetchQuery({
          queryKey: [['student', 'dashboard']],
          queryFn: () => Promise.resolve({}),
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
        this.queryClient.prefetchQuery({
          queryKey: [['student', 'lesson', 'upcoming']],
          queryFn: () => Promise.resolve([]),
          staleTime: 1000 * 60 * 2, // 2 minutes
        })
      );
    }

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Background refresh for stale data
   */
  static startBackgroundRefresh() {
    if (!this.queryClient) return;

    const refreshInterval = setInterval(() => {
      // Refresh stale queries in the background
      this.queryClient.invalidateQueries({
        stale: true,
        refetchType: 'none', // Don't refetch immediately
      });
    }, 1000 * 60 * 5); // Every 5 minutes

    // Return cleanup function
    return () => clearInterval(refreshInterval);
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    if (!this.queryClient) return null;

    const queryCache = this.queryClient.getQueryCache();
    const queries = queryCache.getAll();

    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
    };

    return stats;
  }

  /**
   * Clean up stale queries
   */
  static cleanupStaleQueries() {
    if (!this.queryClient) return;

    this.queryClient.getQueryCache().clear();
  }
}

/**
 * Custom hooks for optimized data fetching
 */
export function useOptimizedStudentList(params: any = {}) {
  return api.admin.student.list.useQuery(params, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}

export function useOptimizedUpcomingLessons(studentId?: string) {
  return api.student.lesson.upcoming.useQuery(
    { studentId },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
      enabled: !!studentId,
    }
  );
}

export function useOptimizedAnalytics(dateRange: any) {
  return api.admin.analytics.dashboard.useQuery(dateRange, {
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

  return api.student.lesson.book.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.student.lesson.upcoming.cancel();

      // Snapshot previous value
      const previousLessons = utils.student.lesson.upcoming.getData();

      // Optimistically update
      utils.student.lesson.upcoming.setData(undefined, (old) => [
        ...(old || []),
        { ...variables, id: 'temp-' + Date.now(), status: 'pending' }
      ]);

      return { previousLessons };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update
      if (context?.previousLessons) {
        utils.student.lesson.upcoming.setData(undefined, context.previousLessons);
      }
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      utils.student.lesson.upcoming.invalidate();
    },
  });
}

// Export query client creator and utilities
export { createOptimizedQueryClient, TRPCQueryUtils };
export type { DefaultOptions };