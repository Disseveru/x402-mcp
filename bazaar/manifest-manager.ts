import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';

export interface BazaarCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  paymentRequired: boolean;
  price: {
    amount: number;
    currency: string;
    formatted: string;
  };
  mcpTool: string;
  endpoint: string;
}

export class BazaarManifestManager {
  private static manifestPath = path.join(__dirname, 'manifest.json');
  private static redisClient: Redis | null = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
  private static REDIS_KEY = 'bazaar:manifest';

  public static async getManifest(): Promise<any> {
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(this.REDIS_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error('[BazaarManifestManager] Failed to read from Redis', err);
      }
    }
    
    // Fallback to local disk
    try {
      const raw = fs.readFileSync(this.manifestPath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Sync to Redis if possible
      if (this.redisClient) {
        await this.redisClient.set(this.REDIS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      return { provider: {}, capabilities: [] }; // Fallback blank if missing
    }
  }

  public static async registerCapability(newCapability: BazaarCapability): Promise<boolean> {
    const manifest = await this.getManifest();
    
    if (!manifest.capabilities) manifest.capabilities = [];

    const existingIndex = manifest.capabilities.findIndex(
      (c: BazaarCapability) => c.name === newCapability.name || c.id === newCapability.id
    );

    if (existingIndex >= 0) {
      manifest.capabilities[existingIndex] = newCapability;
    } else {
      manifest.capabilities.push(newCapability);
    }

    const json = JSON.stringify(manifest, null, 2);

    // Save to Redis
    if (this.redisClient) {
      try {
        await this.redisClient.set(this.REDIS_KEY, json);
      } catch (err) {
        console.error('[BazaarManifestManager] Failed to save to Redis', err);
      }
    }

    // Save to local disk as a backup
    try {
      fs.writeFileSync(this.manifestPath, json, 'utf-8');
    } catch (err) {
      console.warn('[BazaarManifestManager] Failed to save to local disk.', err);
    }

    return true;
  }
}
