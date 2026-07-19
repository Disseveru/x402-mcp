import { createClient, RedisClientType } from 'redis';

export class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) return;

    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('[Cache] REDIS_URL not set. Cache service will not be available.');
      return;
    }

    try {
      this.client = createClient({
        url: redisUrl,
      });

      this.client.on('error', (err) => {
        console.error('[Cache] Redis error:', err);
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('[Cache] Connected to Redis');
    } catch (err) {
      console.error('[Cache] Connection failed:', err);
      this.client = null;
    }
  }

  async set(key: string, value: any, expirySeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('[Cache] Redis not connected. Skipping set operation.');
      return;
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (expirySeconds) {
        await this.client.setEx(key, expirySeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      console.error('[Cache] Set error:', err);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      console.warn('[Cache] Redis not connected. Skipping get operation.');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (err) {
      console.error('[Cache] Get error:', err);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.del(key);
    } catch (err) {
      console.error('[Cache] Delete error:', err);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (err) {
      console.error('[Cache] Pattern invalidation error:', err);
    }
  }

  async cacheToolResult(toolName: string, args: any, result: any, ttlSeconds: number = 3600): Promise<void> {
    const cacheKey = `tool:${toolName}:${Buffer.from(JSON.stringify(args)).toString('base64').slice(0, 50)}`;
    await this.set(cacheKey, result, ttlSeconds);
  }

  async getToolResultFromCache<T = any>(toolName: string, args: any): Promise<T | null> {
    const cacheKey = `tool:${toolName}:${Buffer.from(JSON.stringify(args)).toString('base64').slice(0, 50)}`;
    return this.get<T>(cacheKey);
  }

  async incrementCounter(key: string, increment: number = 1): Promise<number> {
    if (!this.isConnected || !this.client) return 0;

    try {
      return await this.client.incrBy(key, increment);
    } catch (err) {
      console.error('[Cache] Increment error:', err);
      return 0;
    }
  }

  async getCounter(key: string): Promise<number> {
    if (!this.isConnected || !this.client) return 0;

    try {
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (err) {
      console.error('[Cache] Get counter error:', err);
      return 0;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('[Cache] Redis connection closed');
    }
  }
}

export const cache = new CacheService();

