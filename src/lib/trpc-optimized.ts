/**
 * Optimized TRPC Configuration
 * 
 * Enhanced TRPC setup with intelligent caching, batch operations, and performance monitoring
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, CACHE_CONFIG } from "@/lib/redis";
import { cacheWrapper } from "@/lib/cache-wrapper";
import { TRPCError, initTRPC } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";

export interface OptimizedTRPCContext {
  prisma: typeof prisma;
  session: Session | null;
  redis: typeof redis;
  cacheWrapper: typeof cacheWrapper;
  requestId: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
}

interface PerformanceData {
  requestId: string;
  procedure: string;
  duration: number;
  cacheHit: boolean;
  userId?: string;
  timestamp: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

class TRPCPerformanceMonitor {
  private metrics: Map<string, PerformanceData[]> = new Map();

  logRequest(data: PerformanceData) {
    const procedureMetrics = this.metrics.get(data.procedure) || [];
    procedureMetrics.push(data);
    
    // Keep only last 100 requests per procedure
    if (procedureMetrics.length > 100) {
      procedureMetrics.shift();
    }
    
    this.metrics.set(data.procedure, procedureMetrics);

    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && data.duration > 1000) {
      console.warn(`[TRPC] Slow request: ${data.procedure} took ${data.duration}ms`);
    }
  }

  getMetrics(procedure?: string) {
    if (procedure) {
      return this.metrics.get(procedure) || [];
    }
    
    const allMetrics: PerformanceData[] = [];
    for (const procedureMetrics of this.metrics.values()) {
      allMetrics.push(...procedureMetrics);
    }
    
    return allMetrics;
  }

  getAverageResponseTime(procedure?: string): number {
    const metrics = this.getMetrics(procedure);
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / metrics.length;
  }

  getCacheHitRate(procedure?: string): number {
    const metrics = this.getMetrics(procedure);
    if (metrics.length === 0) return 0;
    
    const cacheHits = metrics.filter(metric => metric.cacheHit).length;
    return (cacheHits / metrics.length) * 100;
  }

  getSlowestProcedures(limit = 10) {
    const procedureStats = new Map<string, { avgTime: number; count: number }>();
    
    for (const [procedure, metrics] of this.metrics.entries()) {
      const avgTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      procedureStats.set(procedure, { avgTime, count: metrics.length });
    }
    
    return Array.from(procedureStats.entries())
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, limit)
      .map(([procedure, stats]) => ({ procedure, ...stats }));
  }
}

export const performanceMonitor = new TRPCPerformanceMonitor();

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract client IP address
 */
function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

/**
 * Create optimized TRPC context
 */
export const createOptimizedTRPCContext = async (
  opts: CreateNextContextOptions | { headers: Headers },
): Promise<OptimizedTRPCContext> => {
  let session = null;
  let userAgent: string | undefined;
  let ip: string | undefined;

  // Handle both Next.js Pages Router and App Router
  if ("req" in opts && "res" in opts) {
    session = await getServerSession(opts.req, opts.res, authOptions);
    userAgent = opts.req.headers['user-agent'];
    ip = getClientIp(opts.req);
  } else {
    session = await getServerSession(authOptions);
    if ('headers' in opts) {
      userAgent = opts.headers.get('user-agent') || undefined;
      ip = opts.headers.get('x-forwarded-for') || 
           opts.headers.get('x-real-ip') || 
           undefined;
    }
  }

  return {
    prisma,
    session,
    redis,
    cacheWrapper,
    requestId: generateRequestId(),
    startTime: performance.now(),
    userAgent,
    ip,
  };
};

/**
 * Initialize optimized TRPC
 */
const t = initTRPC.context<OptimizedTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    // Log performance data for errors
    if (ctx) {
      const duration = performance.now() - ctx.startTime;
      performanceMonitor.logRequest({
        requestId: ctx.requestId,
        procedure: 'error',
        duration,
        cacheHit: false,
        userId: ctx.session?.user?.id,
        timestamp: Date.now(),
      });
    }

    // Don't expose internal errors in production
    const isSafeError =
      error.code === "BAD_REQUEST" || 
      error.code === "UNAUTHORIZED" || 
      error.code === "FORBIDDEN" ||
      error.code === "NOT_FOUND";
      
    const sanitizedMessage =
      process.env.NODE_ENV === "production" && !isSafeError
        ? "An unexpected error occurred"
        : error.message;

    return {
      ...shape,
      message: sanitizedMessage,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        requestId: ctx?.requestId,
      },
    };
  },
});

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = t.middleware(async ({ ctx, next, path }) => {
  const startTime = performance.now();
  
  try {
    const result = await next();
    
    // Log successful request performance
    const duration = performance.now() - startTime;
    performanceMonitor.logRequest({
      requestId: ctx.requestId,
      procedure: path,
      duration,
      cacheHit: false, // Will be updated by cache middleware
      userId: ctx.session?.user?.id,
      timestamp: Date.now(),
    });
    
    return result;
  } catch (error) {
    // Log error request performance
    const duration = performance.now() - startTime;
    performanceMonitor.logRequest({
      requestId: ctx.requestId,
      procedure: path,
      duration,
      cacheHit: false,
      userId: ctx.session?.user?.id,
      timestamp: Date.now(),
    });
    
    throw error;
  }
});

/**
 * Rate limiting middleware
 */
const rateLimitMiddleware = (config: RateLimitConfig) => {
  return t.middleware(async ({ ctx, next, path }) => {
    if (!redis.isConnected()) {
      return next(); // Skip rate limiting if Redis not available
    }

    const key = `${CACHE_CONFIG.NAMESPACES.RATE_LIMIT}${ctx.ip || 'unknown'}:${path}`;
    const currentCount = await redis.incr(key, config.windowMs / 1000);

    if (currentCount > config.maxRequests) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
      });
    }

    return next();
  });
};

/**
 * Cache middleware for queries
 */
const cacheMiddleware = <T>(
  config: {
    ttl?: number;
    tags?: string[];
    generateKey?: (ctx: OptimizedTRPCContext, input: any) => string;
    skipCache?: (ctx: OptimizedTRPCContext, input: any) => boolean;
  } = {}
) => {
  return t.middleware(async ({ ctx, next, input, path }) => {
    const isQuery = path.includes('get') || path.includes('list') || path.includes('find');
    
    if (!isQuery || !redis.isConnected()) {
      return next();
    }

    // Skip cache if specified
    if (config.skipCache && config.skipCache(ctx, input)) {
      return next();
    }

    const cacheKey = config.generateKey 
      ? config.generateKey(ctx, input)
      : `${CACHE_CONFIG.NAMESPACES.QUERIES}${path}:${JSON.stringify(input)}`;

    try {
      // Try to get from cache
      const cachedResult = await redis.get<T>(cacheKey);
      if (cachedResult !== null) {
        // Update performance metrics to reflect cache hit
        const duration = performance.now() - ctx.startTime;
        performanceMonitor.logRequest({
          requestId: ctx.requestId,
          procedure: path,
          duration,
          cacheHit: true,
          userId: ctx.session?.user?.id,
          timestamp: Date.now(),
        });
        
        return { data: cachedResult };
      }

      // Execute query
      const result = await next();

      // Cache the result
      if (result.ok) {
        await redis.set(cacheKey, result.data, {
          ttl: config.ttl || CACHE_CONFIG.TTL.MEDIUM,
          tags: config.tags,
        });
      }

      return result;
    } catch (error) {
      console.error('[TRPC Cache Middleware] Error:', error);
      return next(); // Fallback to regular execution
    }
  });
};

/**
 * Authentication middleware
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "Not authenticated",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Admin role middleware
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Student role middleware
 */
const isStudent = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (ctx.session.user.role !== "STUDENT") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Student access required" });
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

// Export router and procedures
export const createOptimizedTRPCRouter = t.router;

// Base procedures
export const publicProcedure = t.procedure
  .use(performanceMiddleware);

export const protectedProcedure = t.procedure
  .use(performanceMiddleware)
  .use(isAuthed);

export const adminProcedure = t.procedure
  .use(performanceMiddleware)
  .use(isAdmin)
  .use(rateLimitMiddleware({ windowMs: 60000, maxRequests: 100 })); // 100 requests per minute

export const studentProcedure = t.procedure
  .use(performanceMiddleware)
  .use(isStudent)
  .use(rateLimitMiddleware({ windowMs: 60000, maxRequests: 200 })); // 200 requests per minute

// Cached procedures for read operations
export const cachedQueryProcedure = t.procedure
  .use(performanceMiddleware)
  .use(cacheMiddleware());

export const cachedProtectedQueryProcedure = t.procedure
  .use(performanceMiddleware)
  .use(isAuthed)
  .use(cacheMiddleware());

export const cachedAdminQueryProcedure = t.procedure
  .use(performanceMiddleware)
  .use(isAdmin)
  .use(cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.LONG,
    tags: ['admin'],
  }));

export const cachedStudentQueryProcedure = t.procedure
  .use(performanceMiddleware)
  .use(isStudent)
  .use(cacheMiddleware({
    ttl: CACHE_CONFIG.TTL.MEDIUM,
    tags: ['student'],
  }));

// Batch operation utilities
export class TRPCBatchOperations {
  /**
   * Batch get students by IDs
   */
  static async getStudentsByIds(
    ctx: OptimizedTRPCContext,
    studentIds: string[]
  ) {
    // Try to get from cache first
    const cacheKeys = studentIds.map(id => `${CACHE_CONFIG.PREFIXES.STUDENT}${id}`);
    const cachedResults = await redis.mget<any>(cacheKeys);
    
    const missingIds: string[] = [];
    const results: any[] = [];
    
    cachedResults.forEach((cached, index) => {
      if (cached === null) {
        missingIds.push(studentIds[index]);
        results[index] = null;
      } else {
        results[index] = cached;
      }
    });
    
    // Fetch missing students from database
    if (missingIds.length > 0) {
      const students = await ctx.prisma.student.findMany({
        where: { id: { in: missingIds } },
        include: {
          user: true,
          _count: { select: { lessons: true, payments: true } },
        },
      });
      
      // Cache the results and update the results array
      const cacheData: Record<string, any> = {};
      
      students.forEach(student => {
        const index = studentIds.indexOf(student.id);
        results[index] = student;
        cacheData[`${CACHE_CONFIG.PREFIXES.STUDENT}${student.id}`] = student;
      });
      
      // Batch cache the missing results
      if (Object.keys(cacheData).length > 0) {
        await redis.mset(cacheData, CACHE_CONFIG.TTL.MEDIUM);
      }
    }
    
    return results.filter(Boolean); // Remove null entries
  }

  /**
   * Batch invalidate cache by patterns
   */
  static async invalidateByPatterns(patterns: string[]) {
    const invalidationPromises = patterns.map(pattern => 
      redis.clearByPattern(pattern)
    );
    
    const results = await Promise.all(invalidationPromises);
    return results.reduce((total, count) => total + count, 0);
  }
}

// Export performance monitor and batch operations
export { performanceMonitor, TRPCBatchOperations };
export type { PerformanceData, RateLimitConfig };