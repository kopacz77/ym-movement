/**
 * Cache Wrapper for Database Queries
 * 
 * Intelligent caching layer for Prisma queries with automatic invalidation
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import { redis, CACHE_CONFIG, type CacheOptions } from './redis';
import type { PrismaClient } from '@prisma/client';

interface QueryCacheConfig {
  ttl?: number;
  tags?: string[];
  key?: string;
  skipCache?: boolean;
  refreshCache?: boolean;
}

interface CacheMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  cacheErrors: number;
  averageQueryTime: number;
}

class DatabaseCacheWrapper {
  private metrics: CacheMetrics = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheErrors: 0,
    averageQueryTime: 0,
  };

  /**
   * Cached query execution
   */
  async cachedQuery<T>(
    queryFn: () => Promise<T>,
    config: QueryCacheConfig = {}
  ): Promise<T> {
    const startTime = performance.now();
    this.metrics.totalQueries++;

    // Skip cache if specified or Redis not available
    if (config.skipCache || !redis.isConnected()) {
      const result = await queryFn();
      this.updateMetrics(startTime, false);
      return result;
    }

    const cacheKey = config.key || this.generateCacheKey(queryFn);
    
    try {
      // Try to get from cache first
      if (!config.refreshCache) {
        const cachedResult = await redis.get<T>(cacheKey);
        if (cachedResult !== null) {
          this.metrics.cacheHits++;
          this.updateMetrics(startTime, true);
          return cachedResult;
        }
      }

      // Cache miss - execute query
      this.metrics.cacheMisses++;
      const result = await queryFn();
      
      // Cache the result
      const cacheOptions: CacheOptions = {
        ttl: config.ttl || CACHE_CONFIG.TTL.MEDIUM,
        tags: config.tags,
      };

      await redis.set(cacheKey, result, cacheOptions);
      this.updateMetrics(startTime, false);
      
      return result;
    } catch (error) {
      this.metrics.cacheErrors++;
      console.error('[Cache Wrapper] Cache operation failed:', error);
      
      // Fallback to direct query execution
      const result = await queryFn();
      this.updateMetrics(startTime, false);
      return result;
    }
  }

  /**
   * Generate cache key from function
   */
  private generateCacheKey(queryFn: Function): string {
    const fnString = queryFn.toString();
    const hash = this.simpleHash(fnString);
    return `${CACHE_CONFIG.NAMESPACES.QUERIES}${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(startTime: number, wasFromCache: boolean): void {
    const queryTime = performance.now() - startTime;
    this.metrics.averageQueryTime = 
      (this.metrics.averageQueryTime * (this.metrics.totalQueries - 1) + queryTime) / 
      this.metrics.totalQueries;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics & { hitRate: number } {
    const hitRate = this.metrics.totalQueries > 0 
      ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100 
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheErrors: 0,
      averageQueryTime: 0,
    };
  }
}

// Create singleton instance
export const cacheWrapper = new DatabaseCacheWrapper();

/**
 * Student queries with caching
 */
export class StudentCache {
  /**
   * Get student by ID with caching
   */
  static async getById(prisma: PrismaClient, id: string) {
    return cacheWrapper.cachedQuery(
      () => prisma.student.findUnique({
        where: { id },
        include: {
          user: true,
          lessons: {
            include: {
              rinkTimeSlot: {
                include: { rink: true }
              }
            },
            orderBy: { startTime: 'desc' },
            take: 10,
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }),
      {
        key: `${CACHE_CONFIG.PREFIXES.STUDENT}${id}`,
        ttl: CACHE_CONFIG.TTL.MEDIUM,
        tags: ['student', `student:${id}`],
      }
    );
  }

  /**
   * Get student list with caching
   */
  static async getList(
    prisma: PrismaClient, 
    params: {
      skip?: number;
      take?: number;
      isApproved?: boolean;
      search?: string;
    } = {}
  ) {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.STUDENT}list:${JSON.stringify(params)}`;
    
    return cacheWrapper.cachedQuery(
      () => prisma.student.findMany({
        skip: params.skip,
        take: params.take,
        where: {
          ...(params.isApproved !== undefined && { isApproved: params.isApproved }),
          ...(params.search && {
            user: {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
              ],
            },
          }),
        },
        include: {
          user: true,
          _count: {
            select: {
              lessons: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      {
        key: cacheKey,
        ttl: CACHE_CONFIG.TTL.SHORT,
        tags: ['student', 'student-list'],
      }
    );
  }

  /**
   * Invalidate student cache
   */
  static async invalidate(studentId?: string) {
    const tags = studentId 
      ? ['student', `student:${studentId}`, 'student-list']
      : ['student', 'student-list'];
    
    return redis.invalidateByTags(tags);
  }
}

/**
 * Lesson queries with caching
 */
export class LessonCache {
  /**
   * Get lessons by date range with caching
   */
  static async getByDateRange(
    prisma: PrismaClient,
    startDate: Date,
    endDate: Date,
    rinkId?: string
  ) {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.LESSON}range:${startDate.toISOString()}:${endDate.toISOString()}:${rinkId || 'all'}`;
    
    return cacheWrapper.cachedQuery(
      () => prisma.lesson.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          ...(rinkId && { rinkTimeSlot: { rinkId } }),
        },
        include: {
          student: {
            include: { user: true },
          },
          rinkTimeSlot: {
            include: { rink: true },
          },
          payments: true,
        },
        orderBy: { startTime: 'asc' },
      }),
      {
        key: cacheKey,
        ttl: CACHE_CONFIG.TTL.SHORT,
        tags: ['lesson', 'schedule'],
      }
    );
  }

  /**
   * Get upcoming lessons with caching
   */
  static async getUpcoming(prisma: PrismaClient, studentId?: string, limit = 10) {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.LESSON}upcoming:${studentId || 'all'}:${limit}`;
    
    return cacheWrapper.cachedQuery(
      () => prisma.lesson.findMany({
        where: {
          startTime: { gt: new Date() },
          ...(studentId && { studentId }),
        },
        include: {
          student: {
            include: { user: true },
          },
          rinkTimeSlot: {
            include: { rink: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take: limit,
      }),
      {
        key: cacheKey,
        ttl: CACHE_CONFIG.TTL.SHORT,
        tags: ['lesson', 'upcoming-lessons'],
      }
    );
  }

  /**
   * Invalidate lesson cache
   */
  static async invalidate(lessonId?: string) {
    const tags = lessonId 
      ? ['lesson', `lesson:${lessonId}`, 'schedule', 'upcoming-lessons']
      : ['lesson', 'schedule', 'upcoming-lessons'];
    
    return redis.invalidateByTags(tags);
  }
}

/**
 * Payment queries with caching
 */
export class PaymentCache {
  /**
   * Get payments with caching
   */
  static async getList(
    prisma: PrismaClient,
    params: {
      skip?: number;
      take?: number;
      studentId?: string;
      status?: string;
    } = {}
  ) {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.PAYMENT}list:${JSON.stringify(params)}`;
    
    return cacheWrapper.cachedQuery(
      () => prisma.payment.findMany({
        skip: params.skip,
        take: params.take,
        where: {
          ...(params.studentId && { studentId: params.studentId }),
          ...(params.status && { status: params.status }),
        },
        include: {
          student: {
            include: { user: true },
          },
          lesson: {
            include: {
              rinkTimeSlot: {
                include: { rink: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      {
        key: cacheKey,
        ttl: CACHE_CONFIG.TTL.MEDIUM,
        tags: ['payment', 'payment-list'],
      }
    );
  }

  /**
   * Get payment analytics with caching
   */
  static async getAnalytics(
    prisma: PrismaClient,
    startDate: Date,
    endDate: Date
  ) {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.PAYMENT}analytics:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    return cacheWrapper.cachedQuery(
      async () => {
        const [total, paid, pending, overdue] = await Promise.all([
          prisma.payment.aggregate({
            where: { lesson_date: { gte: startDate, lte: endDate } },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.payment.aggregate({
            where: { 
              lesson_date: { gte: startDate, lte: endDate },
              status: 'PAID',
            },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.payment.aggregate({
            where: { 
              lesson_date: { gte: startDate, lte: endDate },
              status: 'PENDING',
            },
            _sum: { amount: true },
            _count: true,
          }),
          prisma.payment.aggregate({
            where: { 
              lesson_date: { gte: startDate, lte: endDate },
              status: 'OVERDUE',
            },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        return { total, paid, pending, overdue };
      },
      {
        key: cacheKey,
        ttl: CACHE_CONFIG.TTL.LONG,
        tags: ['payment', 'analytics'],
      }
    );
  }

  /**
   * Invalidate payment cache
   */
  static async invalidate(paymentId?: string) {
    const tags = paymentId 
      ? ['payment', `payment:${paymentId}`, 'payment-list', 'analytics']
      : ['payment', 'payment-list', 'analytics'];
    
    return redis.invalidateByTags(tags);
  }
}

/**
 * Schedule queries with caching
 */
export class ScheduleCache {
  /**
   * Get available time slots with caching
   */
  static async getAvailableSlots(
    prisma: PrismaClient,
    date: Date,
    rinkId?: string
  ) {
    const cacheKey = `${CACHE_CONFIG.PREFIXES.SCHEDULE}available:${date.toDateString()}:${rinkId || 'all'}`;
    
    return cacheWrapper.cachedQuery(
      () => prisma.rinkTimeSlot.findMany({
        where: {
          date,
          ...(rinkId && { rinkId }),
          lesson: null, // Available slots have no lesson assigned
        },
        include: {
          rink: true,
        },
        orderBy: { startTime: 'asc' },
      }),
      {
        key: cacheKey,
        ttl: CACHE_CONFIG.TTL.SHORT,
        tags: ['schedule', 'time-slots'],
      }
    );
  }

  /**
   * Invalidate schedule cache
   */
  static async invalidate(date?: Date) {
    const tags = date 
      ? ['schedule', 'time-slots', `schedule:${date.toDateString()}`]
      : ['schedule', 'time-slots'];
    
    return redis.invalidateByTags(tags);
  }
}

// Export cache classes and wrapper
export { cacheWrapper };
export type { QueryCacheConfig, CacheMetrics };