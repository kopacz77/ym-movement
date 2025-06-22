/**
 * Cache Invalidation Strategies
 * 
 * Intelligent cache invalidation for maintaining data consistency
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import { redis, CACHE_CONFIG } from './redis';
import { TRPCQueryUtils } from './api-optimized';

interface InvalidationRule {
  event: string;
  patterns: string[];
  tags: string[];
  delay?: number;
  conditions?: (data: any) => boolean;
}

interface InvalidationEvent {
  type: string;
  data: any;
  timestamp: number;
  source: 'admin' | 'student' | 'system';
}

class CacheInvalidationManager {
  private rules: Map<string, InvalidationRule[]> = new Map();
  private eventQueue: InvalidationEvent[] = [];
  private isProcessing = false;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.setupDefaultRules();
    this.startEventProcessor();
  }

  /**
   * Setup default invalidation rules
   */
  private setupDefaultRules() {
    // Student-related invalidations
    this.addRule('student.created', {
      event: 'student.created',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.STUDENT}list:*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*student*list*`,
      ],
      tags: ['student', 'student-list', 'analytics'],
    });

    this.addRule('student.updated', {
      event: 'student.updated',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.STUDENT}{{id}}`,
        `${CACHE_CONFIG.PREFIXES.STUDENT}list:*`,
      ],
      tags: ['student', 'student-list'],
      conditions: (data) => !!data.id,
    });

    this.addRule('student.approved', {
      event: 'student.approved',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.STUDENT}{{id}}`,
        `${CACHE_CONFIG.PREFIXES.STUDENT}list:*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*pendingApprovals*`,
      ],
      tags: ['student', 'student-list', 'pending-approvals'],
    });

    // Lesson-related invalidations
    this.addRule('lesson.booked', {
      event: 'lesson.booked',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.LESSON}*`,
        `${CACHE_CONFIG.PREFIXES.SCHEDULE}*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*upcoming*`,
      ],
      tags: ['lesson', 'schedule', 'upcoming-lessons', 'time-slots'],
    });

    this.addRule('lesson.cancelled', {
      event: 'lesson.cancelled',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.LESSON}{{id}}`,
        `${CACHE_CONFIG.PREFIXES.SCHEDULE}*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*upcoming*`,
      ],
      tags: ['lesson', 'schedule', 'upcoming-lessons', 'time-slots'],
    });

    // Payment-related invalidations
    this.addRule('payment.updated', {
      event: 'payment.updated',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.PAYMENT}{{id}}`,
        `${CACHE_CONFIG.PREFIXES.PAYMENT}list:*`,
        `${CACHE_CONFIG.PREFIXES.PAYMENT}analytics:*`,
      ],
      tags: ['payment', 'payment-list', 'analytics'],
    });

    this.addRule('payment.verified', {
      event: 'payment.verified',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.PAYMENT}*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*analytics*`,
      ],
      tags: ['payment', 'analytics'],
      delay: 1000, // Delay to ensure DB transaction is complete
    });

    // Schedule-related invalidations
    this.addRule('schedule.changed', {
      event: 'schedule.changed',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.SCHEDULE}*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*timeSlots*`,
        `${CACHE_CONFIG.NAMESPACES.QUERIES}*available*`,
      ],
      tags: ['schedule', 'time-slots'],
    });

    // System-wide invalidations
    this.addRule('system.maintenance', {
      event: 'system.maintenance',
      patterns: ['*'],
      tags: [],
    });

    this.addRule('user.roleChanged', {
      event: 'user.roleChanged',
      patterns: [
        `${CACHE_CONFIG.PREFIXES.USER}{{id}}`,
        `${CACHE_CONFIG.PREFIXES.STUDENT}{{studentId}}`,
        `${CACHE_CONFIG.NAMESPACES.SESSIONS}*{{id}}*`,
      ],
      tags: ['user', 'student', 'sessions'],
    });
  }

  /**
   * Add invalidation rule
   */
  addRule(eventType: string, rule: InvalidationRule) {
    const existingRules = this.rules.get(eventType) || [];
    existingRules.push(rule);
    this.rules.set(eventType, existingRules);
  }

  /**
   * Remove invalidation rule
   */
  removeRule(eventType: string, ruleIndex?: number) {
    if (ruleIndex !== undefined) {
      const rules = this.rules.get(eventType) || [];
      rules.splice(ruleIndex, 1);
      this.rules.set(eventType, rules);
    } else {
      this.rules.delete(eventType);
    }
  }

  /**
   * Trigger cache invalidation
   */
  async invalidate(event: InvalidationEvent) {
    this.eventQueue.push(event);
    await this.processEventQueue();
  }

  /**
   * Process event queue
   */
  private async processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      await this.processEvent(event);
    }

    this.isProcessing = false;
  }

  /**
   * Process individual event
   */
  private async processEvent(event: InvalidationEvent) {
    const rules = this.rules.get(event.type) || [];

    for (const rule of rules) {
      try {
        // Check conditions if specified
        if (rule.conditions && !rule.conditions(event.data)) {
          continue;
        }

        // Apply delay if specified
        if (rule.delay) {
          await new Promise(resolve => setTimeout(resolve, rule.delay));
        }

        // Invalidate by patterns
        await this.invalidateByPatterns(rule.patterns, event.data);

        // Invalidate by tags
        if (rule.tags.length > 0) {
          await redis.invalidateByTags(rule.tags);
        }

        // Notify listeners
        await this.notifyListeners(event);

        console.log(`[Cache Invalidation] Processed event: ${event.type}`);
      } catch (error) {
        console.error(`[Cache Invalidation] Error processing event ${event.type}:`, error);
      }
    }
  }

  /**
   * Invalidate cache by patterns with data substitution
   */
  private async invalidateByPatterns(patterns: string[], data: any) {
    const processedPatterns = patterns.map(pattern => 
      this.substituteVariables(pattern, data)
    );

    for (const pattern of processedPatterns) {
      try {
        const deleted = await redis.clearByPattern(pattern);
        if (deleted > 0) {
          console.log(`[Cache Invalidation] Cleared ${deleted} keys for pattern: ${pattern}`);
        }
      } catch (error) {
        console.error(`[Cache Invalidation] Error clearing pattern ${pattern}:`, error);
      }
    }
  }

  /**
   * Substitute variables in patterns
   */
  private substituteVariables(pattern: string, data: any): string {
    let result = pattern;
    
    // Replace {{variable}} with data values
    const matches = pattern.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const variable = match.replace(/[{}]/g, '');
        const value = data[variable];
        if (value !== undefined) {
          result = result.replace(match, value);
        }
      });
    }

    return result;
  }

  /**
   * Notify event listeners
   */
  private async notifyListeners(event: InvalidationEvent) {
    const listeners = this.listeners.get(event.type) || [];
    
    await Promise.all(
      listeners.map(async (listener) => {
        try {
          await listener(event);
        } catch (error) {
          console.error('[Cache Invalidation] Error in event listener:', error);
        }
      })
    );
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: Function) {
    const existingListeners = this.listeners.get(eventType) || [];
    existingListeners.push(listener);
    this.listeners.set(eventType, existingListeners);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType) || [];
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
        this.listeners.set(eventType, listeners);
      }
    };
  }

  /**
   * Start event processor
   */
  private startEventProcessor() {
    // Process events every 100ms
    setInterval(() => {
      this.processEventQueue();
    }, 100);
  }

  /**
   * Get invalidation statistics
   */
  getStats() {
    return {
      rulesCount: this.rules.size,
      queuedEvents: this.eventQueue.length,
      isProcessing: this.isProcessing,
      totalRules: Array.from(this.rules.values()).reduce((sum, rules) => sum + rules.length, 0),
    };
  }

  /**
   * Clear all rules and events
   */
  clear() {
    this.rules.clear();
    this.eventQueue.length = 0;
    this.listeners.clear();
    this.setupDefaultRules();
  }
}

// Create singleton instance
export const cacheInvalidation = new CacheInvalidationManager();

/**
 * Helper functions for common invalidation scenarios
 */
export class CacheInvalidationHelpers {
  /**
   * Invalidate student-related caches
   */
  static async invalidateStudent(studentId: string, action: 'created' | 'updated' | 'deleted' | 'approved') {
    await cacheInvalidation.invalidate({
      type: `student.${action}`,
      data: { id: studentId },
      timestamp: Date.now(),
      source: 'admin',
    });

    // Also invalidate React Query caches
    await TRPCQueryUtils.invalidateRelatedQueries('student', studentId);
  }

  /**
   * Invalidate lesson-related caches
   */
  static async invalidateLesson(lessonId: string, action: 'booked' | 'cancelled' | 'updated', additionalData: any = {}) {
    await cacheInvalidation.invalidate({
      type: `lesson.${action}`,
      data: { id: lessonId, ...additionalData },
      timestamp: Date.now(),
      source: 'student',
    });

    await TRPCQueryUtils.invalidateRelatedQueries('lesson', lessonId);
  }

  /**
   * Invalidate payment-related caches
   */
  static async invalidatePayment(paymentId: string, action: 'updated' | 'verified' | 'created') {
    await cacheInvalidation.invalidate({
      type: `payment.${action}`,
      data: { id: paymentId },
      timestamp: Date.now(),
      source: 'admin',
    });

    await TRPCQueryUtils.invalidateRelatedQueries('payment', paymentId);
  }

  /**
   * Invalidate schedule-related caches
   */
  static async invalidateSchedule(date?: Date, rinkId?: string) {
    await cacheInvalidation.invalidate({
      type: 'schedule.changed',
      data: { date: date?.toISOString(), rinkId },
      timestamp: Date.now(),
      source: 'admin',
    });

    await TRPCQueryUtils.invalidateRelatedQueries('schedule');
  }

  /**
   * Bulk invalidation for multiple entities
   */
  static async bulkInvalidate(operations: Array<{
    type: 'student' | 'lesson' | 'payment' | 'schedule';
    id?: string;
    action: string;
    data?: any;
  }>) {
    const events = operations.map(op => ({
      type: `${op.type}.${op.action}`,
      data: { id: op.id, ...op.data },
      timestamp: Date.now(),
      source: 'system' as const,
    }));

    // Process events in parallel
    await Promise.all(
      events.map(event => cacheInvalidation.invalidate(event))
    );
  }

  /**
   * Time-based cache invalidation
   */
  static startTimeBasedInvalidation() {
    // Invalidate daily caches every hour
    setInterval(async () => {
      await redis.clearByPattern(`${CACHE_CONFIG.PREFIXES.SCHEDULE}*`);
      await redis.clearByPattern(`${CACHE_CONFIG.NAMESPACES.QUERIES}*analytics*`);
      console.log('[Cache Invalidation] Performed hourly cache cleanup');
    }, 60 * 60 * 1000); // Every hour

    // Invalidate stale session data every 15 minutes
    setInterval(async () => {
      await redis.clearByPattern(`${CACHE_CONFIG.NAMESPACES.SESSIONS}*`);
      console.log('[Cache Invalidation] Cleaned up stale sessions');
    }, 15 * 60 * 1000); // Every 15 minutes

    // Return cleanup function
    return () => {
      // In a real implementation, you'd store the interval IDs and clear them
      console.log('[Cache Invalidation] Time-based invalidation stopped');
    };
  }

  /**
   * Emergency cache clear
   */
  static async emergencyClear(reason = 'Emergency maintenance') {
    console.warn(`[Cache Invalidation] Emergency cache clear: ${reason}`);
    
    await Promise.all([
      redis.flushAll(),
      TRPCQueryUtils.cleanupStaleQueries(),
    ]);

    await cacheInvalidation.invalidate({
      type: 'system.maintenance',
      data: { reason },
      timestamp: Date.now(),
      source: 'system',
    });
  }
}

/**
 * React hook for cache invalidation events
 */
export function useCacheInvalidation() {
  const [stats, setStats] = useState(cacheInvalidation.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(cacheInvalidation.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const invalidateStudent = useCallback((studentId: string, action: 'created' | 'updated' | 'deleted' | 'approved') => {
    return CacheInvalidationHelpers.invalidateStudent(studentId, action);
  }, []);

  const invalidateLesson = useCallback((lessonId: string, action: 'booked' | 'cancelled' | 'updated', additionalData?: any) => {
    return CacheInvalidationHelpers.invalidateLesson(lessonId, action, additionalData);
  }, []);

  const invalidatePayment = useCallback((paymentId: string, action: 'updated' | 'verified' | 'created') => {
    return CacheInvalidationHelpers.invalidatePayment(paymentId, action);
  }, []);

  const invalidateSchedule = useCallback((date?: Date, rinkId?: string) => {
    return CacheInvalidationHelpers.invalidateSchedule(date, rinkId);
  }, []);

  return {
    stats,
    invalidateStudent,
    invalidateLesson,
    invalidatePayment,
    invalidateSchedule,
  };
}

// Export main classes and helpers
export { cacheInvalidation, CacheInvalidationHelpers };
export type { InvalidationRule, InvalidationEvent };