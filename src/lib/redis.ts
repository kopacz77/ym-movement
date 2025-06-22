/**
 * Redis Caching Integration
 * 
 * High-performance Redis caching for database queries and API responses
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

import Redis, { type RedisOptions } from 'ioredis';

// Cache configuration
const CACHE_CONFIG = {
  // TTL values in seconds
  TTL: {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 1800, // 30 minutes
    EXTENDED: 3600, // 1 hour
    DAILY: 86400, // 24 hours
  },
  // Cache key prefixes
  PREFIXES: {
    STUDENT: 'student:',
    LESSON: 'lesson:',
    PAYMENT: 'payment:',
    ANALYTICS: 'analytics:',
    USER: 'user:',
    SCHEDULE: 'schedule:',
    RINK: 'rink:',
  },
  // Cache namespaces
  NAMESPACES: {
    QUERIES: 'queries:',
    SESSIONS: 'sessions:',
    RATE_LIMIT: 'rate_limit:',
    LOCKS: 'locks:',
  },
};

interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

class RedisCache {
  private client: Redis;
  private connected = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor() {
    const options: RedisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      commandTimeout: 5000,
      // Connection pool settings
      family: 4,
      // Cluster settings (if using Redis Cluster)
      enableOfflineQueue: false,
    };

    this.client = new Redis(options);
    this.setupEventListeners();
  }

  /**
   * Setup Redis event listeners
   */
  private setupEventListeners() {
    this.client.on('connect', () => {
      console.log('[Redis] Connected to Redis server');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('[Redis] Redis client ready');
    });

    this.client.on('error', (error) => {
      console.error('[Redis] Redis client error:', error);
      this.stats.errors++;
      this.connected = false;
    });

    this.client.on('close', () => {
      console.log('[Redis] Redis connection closed');
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting to Redis server');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      console.log('[Redis] Successfully connected to Redis');
    } catch (error) {
      console.error('[Redis] Failed to connect to Redis:', error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.connected = false;
      console.log('[Redis] Disconnected from Redis');
    } catch (error) {
      console.error('[Redis] Error disconnecting from Redis:', error);
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected && this.client.status === 'ready';
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) {
      console.warn('[Redis] Not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[Redis] Error getting from cache:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.isConnected()) {
      console.warn('[Redis] Not connected, skipping cache set');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const ttl = options.ttl || CACHE_CONFIG.TTL.MEDIUM;

      if (options.tags && options.tags.length > 0) {
        // Store tags for cache invalidation
        await this.addTagsForKey(key, options.tags);
      }

      await this.client.setex(key, ttl, serializedValue);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('[Redis] Error setting cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string | string[]): Promise<number> {
    if (!this.isConnected()) {
      console.warn('[Redis] Not connected, skipping cache delete');
      return 0;
    }

    try {
      const keys = Array.isArray(key) ? key : [key];
      const result = await this.client.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('[Redis] Error deleting from cache:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('[Redis] Error checking key existence:', error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mget(...keys);
      
      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        try {
          return JSON.parse(value) as T;
        } catch (error) {
          console.error(`[Redis] Error parsing cached value for key ${keys[index]}:`, error);
          return null;
        }
      });
    } catch (error) {
      console.error('[Redis] Error getting multiple values:', error);
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }

      await pipeline.exec();
      this.stats.sets += Object.keys(keyValuePairs).length;
      return true;
    } catch (error) {
      console.error('[Redis] Error setting multiple values:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const pipeline = this.client.pipeline();
      pipeline.incr(key);
      
      if (ttl) {
        pipeline.expire(key, ttl);
      }

      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      console.error('[Redis] Error incrementing counter:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get keys by pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isConnected()) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('[Redis] Error getting keys by pattern:', error);
      return [];
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      return await this.del(keys);
    } catch (error) {
      console.error('[Redis] Error clearing cache by pattern:', error);
      return 0;
    }
  }

  /**
   * Add tags for cache invalidation
   */
  private async addTagsForKey(key: string, tags: string[]): Promise<void> {
    try {
      const pipeline = this.client.pipeline();
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, CACHE_CONFIG.TTL.DAILY);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('[Redis] Error adding tags for key:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      let totalDeleted = 0;
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.client.smembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await this.del(keys);
          totalDeleted += deleted;
        }
        
        // Remove the tag set itself
        await this.del(tagKey);
      }

      return totalDeleted;
    } catch (error) {
      console.error('[Redis] Error invalidating by tags:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      return await this.client.info();
    } catch (error) {
      console.error('[Redis] Error getting cache info:', error);
      return null;
    }
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      await this.client.flushall();
      console.log('[Redis] Cache flushed successfully');
      return true;
    } catch (error) {
      console.error('[Redis] Error flushing cache:', error);
      return false;
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}

// Export singleton instance
export const redis = new RedisCache();

// Export cache configuration and types
export { CACHE_CONFIG };
export type { CacheOptions, CacheStats };

// Auto-connect in production
if (process.env.NODE_ENV === 'production' && process.env.REDIS_HOST) {
  redis.connect().catch((error) => {
    console.error('[Redis] Failed to auto-connect:', error);
  });
}