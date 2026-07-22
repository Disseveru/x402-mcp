import { X402Price } from '../x402/types';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export interface StoreVaultItemInput {
  swarmId: string;
  key: string;
  value: any;
  writerAgentId: string;
  readAccessAgentIds?: string[]; // Allowed agents or ['*'] for all swarm agents
  ttlSeconds?: number; // Default 3600 (1 hour)
  encryptionKey?: string; // Optional custom secret key
}

export interface RetrieveVaultItemInput {
  swarmId: string;
  key: string;
  readerAgentId: string;
  encryptionKey?: string;
}

export interface VaultItemMetadata {
  vaultId: string;
  swarmId: string;
  key: string;
  writerAgentId: string;
  readAccessAgentIds: string[];
  createdAt: number;
  expiresAt: number;
  sizeBytes: number;
  version: number;
}

export interface VaultItemResponse {
  metadata: VaultItemMetadata;
  value: any;
  decryptedAt: number;
}

export interface EncryptedPayload {
  metadata: VaultItemMetadata;
  encryptedData: string;
  iv: string;
  authTag: string;
}

export class AgentContextVaultService {
  public static readonly PRICE: X402Price = {
    amount: 25,
    currency: 'USD_CENT',
    formatted: '$0.25 USD',
  };

  private redis: Redis | null = null;
  private useMemoryFallback = false;
  private memoryVault = new Map<string, EncryptedPayload>();
  private masterSalt: string;

  constructor() {
    this.masterSalt = process.env.VAULT_MASTER_SALT || 'x402_swarm_vault_default_salt_2026';
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) => {
        console.error('Redis error in AgentContextVaultService:', err);
      });
    } else {
      this.useMemoryFallback = true;
    }

    // Schedule periodic in-memory cleanup for expired keys
    setInterval(() => this.cleanupExpiredInMemoryKeys(), 60000);
  }

  /**
   * Encrypts and stores a shared context payload for a swarm.
   */
  public async storeSecret(input: StoreVaultItemInput): Promise<VaultItemMetadata> {
    const {
      swarmId,
      key,
      value,
      writerAgentId,
      readAccessAgentIds = ['*'],
      ttlSeconds = 3600,
      encryptionKey,
    } = input;

    if (!swarmId || !key || value === undefined || !writerAgentId) {
      throw new Error('swarmId, key, value, and writerAgentId are required');
    }

    const vaultId = `vlt_${crypto.randomBytes(8).toString('hex')}`;
    const createdAt = Date.now();
    const expiresAt = createdAt + Math.max(10, ttlSeconds) * 1000;

    const rawPayloadString = JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(rawPayloadString, 'utf-8');

    const metadata: VaultItemMetadata = {
      vaultId,
      swarmId,
      key,
      writerAgentId,
      readAccessAgentIds,
      createdAt,
      expiresAt,
      sizeBytes,
      version: 1,
    };

    // Encrypt content
    const derivedKey = this.deriveEncryptionKey(swarmId, encryptionKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

    let encrypted = cipher.update(rawPayloadString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const encryptedPayload: EncryptedPayload = {
      metadata,
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag,
    };

    const storageKey = this.getStorageKey(swarmId, key);

    if (this.redis && !this.useMemoryFallback) {
      await this.redis.set(storageKey, JSON.stringify(encryptedPayload), 'EX', Math.max(10, ttlSeconds));
    } else {
      this.memoryVault.set(storageKey, encryptedPayload);
    }

    return metadata;
  }

  /**
   * Decrypts and retrieves a shared context payload if reader agent has permission.
   */
  public async retrieveSecret(input: RetrieveVaultItemInput): Promise<VaultItemResponse> {
    const { swarmId, key, readerAgentId, encryptionKey } = input;

    const storageKey = this.getStorageKey(swarmId, key);
    let payload: EncryptedPayload | null = null;

    if (this.redis && !this.useMemoryFallback) {
      const raw = await this.redis.get(storageKey);
      if (raw) {
        payload = JSON.parse(raw) as EncryptedPayload;
      }
    } else {
      payload = this.memoryVault.get(storageKey) || null;
    }

    if (!payload) {
      throw new Error(`Vault item with key '${key}' in swarm '${swarmId}' not found or expired`);
    }

    // Check expiration
    if (Date.now() > payload.metadata.expiresAt) {
      await this.deleteKey(storageKey);
      throw new Error(`Vault item '${key}' has expired`);
    }

    // Check permissions
    const { readAccessAgentIds, writerAgentId } = payload.metadata;
    const isAuthorized =
      readerAgentId === writerAgentId ||
      readAccessAgentIds.includes('*') ||
      readAccessAgentIds.includes(readerAgentId);

    if (!isAuthorized) {
      throw new Error(`Agent '${readerAgentId}' is unauthorized to read vault key '${key}'`);
    }

    // Decrypt payload
    try {
      const derivedKey = this.deriveEncryptionKey(swarmId, encryptionKey);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        derivedKey,
        Buffer.from(payload.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

      let decrypted = decipher.update(payload.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const parsedValue = JSON.parse(decrypted);

      return {
        metadata: payload.metadata,
        value: parsedValue,
        decryptedAt: Date.now(),
      };
    } catch (err: any) {
      throw new Error(`Failed to decrypt vault item '${key}': invalid encryption key or corrupted data`);
    }
  }

  /**
   * Revokes / deletes a secret from the vault.
   */
  public async revokeSecret(swarmId: string, key: string, agentId: string): Promise<boolean> {
    const storageKey = this.getStorageKey(swarmId, key);
    let payload: EncryptedPayload | null = null;

    if (this.redis && !this.useMemoryFallback) {
      const raw = await this.redis.get(storageKey);
      if (raw) payload = JSON.parse(raw);
    } else {
      payload = this.memoryVault.get(storageKey) || null;
    }

    if (!payload) return false;

    // Only writer agent can revoke
    if (payload.metadata.writerAgentId !== agentId) {
      throw new Error(`Agent '${agentId}' does not have permission to revoke vault item '${key}'`);
    }

    await this.deleteKey(storageKey);
    return true;
  }

  /**
   * Lists metadata of active keys in a swarm for an agent (without exposing secrets).
   */
  public async listSwarmVaultKeys(swarmId: string, requesterAgentId: string): Promise<VaultItemMetadata[]> {
    const results: VaultItemMetadata[] = [];
    const now = Date.now();

    if (this.redis && !this.useMemoryFallback) {
      const keys = await this.redis.keys(`vault:${swarmId}:*`);
      for (const k of keys) {
        const raw = await this.redis.get(k);
        if (raw) {
          const item = JSON.parse(raw) as EncryptedPayload;
          if (item.metadata.expiresAt > now && this.canAccessMetadata(item.metadata, requesterAgentId)) {
            results.push(item.metadata);
          }
        }
      }
    } else {
      for (const [k, item] of this.memoryVault.entries()) {
        if (k.startsWith(`vault:${swarmId}:`)) {
          if (item.metadata.expiresAt > now && this.canAccessMetadata(item.metadata, requesterAgentId)) {
            results.push(item.metadata);
          }
        }
      }
    }

    return results;
  }

  /**
   * Extends the TTL of an active vault item.
   */
  public async extendTTL(
    swarmId: string,
    key: string,
    requesterAgentId: string,
    additionalSeconds: number
  ): Promise<VaultItemMetadata> {
    const storageKey = this.getStorageKey(swarmId, key);
    let payload: EncryptedPayload | null = null;

    if (this.redis && !this.useMemoryFallback) {
      const raw = await this.redis.get(storageKey);
      if (raw) payload = JSON.parse(raw);
    } else {
      payload = this.memoryVault.get(storageKey) || null;
    }

    if (!payload) {
      throw new Error(`Vault item '${key}' not found`);
    }

    if (!this.canAccessMetadata(payload.metadata, requesterAgentId)) {
      throw new Error(`Agent '${requesterAgentId}' unauthorized to update TTL`);
    }

    payload.metadata.expiresAt += additionalSeconds * 1000;
    const remainingSeconds = Math.max(10, Math.round((payload.metadata.expiresAt - Date.now()) / 1000));

    if (this.redis && !this.useMemoryFallback) {
      await this.redis.set(storageKey, JSON.stringify(payload), 'EX', remainingSeconds);
    } else {
      this.memoryVault.set(storageKey, payload);
    }

    return payload.metadata;
  }

  // --- Helper Methods ---

  private getStorageKey(swarmId: string, key: string): string {
    return `vault:${swarmId}:${key}`;
  }

  private deriveEncryptionKey(swarmId: string, customSecret?: string): Buffer {
    const seed = customSecret
      ? `${customSecret}:${swarmId}:${this.masterSalt}`
      : `${swarmId}:${this.masterSalt}`;
    return crypto.createHash('sha256').update(seed).digest();
  }

  private canAccessMetadata(meta: VaultItemMetadata, agentId: string): boolean {
    return (
      meta.writerAgentId === agentId ||
      meta.readAccessAgentIds.includes('*') ||
      meta.readAccessAgentIds.includes(agentId)
    );
  }

  private async deleteKey(storageKey: string): Promise<void> {
    if (this.redis && !this.useMemoryFallback) {
      await this.redis.del(storageKey);
    } else {
      this.memoryVault.delete(storageKey);
    }
  }

  private cleanupExpiredInMemoryKeys(): void {
    const now = Date.now();
    for (const [key, payload] of this.memoryVault.entries()) {
      if (payload.metadata.expiresAt <= now) {
        this.memoryVault.delete(key);
      }
    }
  }
}
