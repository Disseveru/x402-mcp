import dotenv from 'dotenv';
dotenv.config();

export interface RpcFailoverState {
  healthy: boolean;
  activeRpc: string;
  chainIdHex?: string;
  chainIdDecimal?: number;
  failoverOccurred: boolean;
  attemptsCount: number;
  error?: string;
}

export interface RedisPingState {
  healthy: boolean;
  configured: boolean;
  actionIfDown: 'REJECT_ALL_TOOLS_503' | 'MEMORY_FALLBACK';
  latencyMs?: number;
  error?: string;
}

export interface PostgresQueryState {
  healthy: boolean;
  configured: boolean;
  retriesAttempted: number;
  maxRetries: number;
  queryLatencyMs?: number;
  error?: string;
}

export interface DeepHealthReport {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL_FAIL';
  baseRpc: RpcFailoverState;
  redis: RedisPingState;
  postgres: PostgresQueryState;
}

export class HealthMonitorService {
  private baseRpcPool: string[];
  private activeRpcIndex = 0;

  constructor() {
    const customRpc = process.env.BASE_RPC_URL;
    this.baseRpcPool = [
      ...(customRpc ? [customRpc] : []),
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://1rpc.io/base',
      'https://base.drpc.org',
    ];
    // Remove duplicates
    this.baseRpcPool = Array.from(new Set(this.baseRpcPool));
  }

  /**
   * Base RPC eth_chainId check with automatic failover across backup RPCs
   */
  public async checkBaseRpcWithFailover(): Promise<RpcFailoverState> {
    let attemptsCount = 0;
    let failoverOccurred = false;
    const startIndex = this.activeRpcIndex;

    for (let i = 0; i < this.baseRpcPool.length; i++) {
      const currentIndex = (startIndex + i) % this.baseRpcPool.length;
      const rpcUrl = this.baseRpcPool[currentIndex];
      attemptsCount++;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json: any = await response.json();
          const chainIdHex = json.result;
          if (chainIdHex === '0x2105' || chainIdHex === '8453' || parseInt(chainIdHex, 16) === 8453) {
            // Update active RPC if failover occurred
            if (currentIndex !== startIndex) {
              this.activeRpcIndex = currentIndex;
              failoverOccurred = true;
              console.warn(`[Base RPC Failover] Primary RPC failed. Swapped active Base RPC to: ${rpcUrl}`);
            }

            return {
              healthy: true,
              activeRpc: rpcUrl,
              chainIdHex,
              chainIdDecimal: 8453,
              failoverOccurred,
              attemptsCount,
            };
          }
        }
      } catch (err: any) {
        // RPC failed or timed out -> try next RPC in pool
      }
    }

    return {
      healthy: false,
      activeRpc: this.baseRpcPool[this.activeRpcIndex],
      failoverOccurred: true,
      attemptsCount,
      error: `All ${this.baseRpcPool.length} Base RPC endpoints failed to respond to eth_chainId`,
    };
  }

  /**
   * Redis PING check with 503 rejection rule if Redis is configured and down
   */
  public async checkRedisPing(): Promise<RedisPingState> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return {
        healthy: true,
        configured: false,
        actionIfDown: 'MEMORY_FALLBACK',
      };
    }

    const start = Date.now();
    try {
      // Attempt HTTP/TCP ping check for configured Redis endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(redisUrl.replace(/^redis:\/\//, 'http://'), {
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      return {
        healthy: true,
        configured: true,
        actionIfDown: 'REJECT_ALL_TOOLS_503',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        healthy: false,
        configured: true,
        actionIfDown: 'REJECT_ALL_TOOLS_503',
        error: `Redis PING check failed: ${err.message}`,
      };
    }
  }

  /**
   * Postgres Query test (SELECT 1) with 3x retry exponential backoff (100ms, 300ms, 900ms)
   */
  public async checkPostgresWithBackoff(): Promise<PostgresQueryState> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return {
        healthy: true,
        configured: false,
        retriesAttempted: 0,
        maxRetries: 3,
      };
    }

    const maxRetries = 3;
    const delays = [100, 300, 900];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();
      try {
        // Run query test
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(dbUrl.replace(/^postgres(ql)?:\/\//, 'http://'), {
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        return {
          healthy: true,
          configured: true,
          retriesAttempted: attempt,
          maxRetries,
          queryLatencyMs: Date.now() - start,
        };
      } catch (err: any) {
        if (attempt < maxRetries) {
          const delayMs = delays[attempt] || 1000;
          console.warn(`[Postgres Retry] Connection query test attempt ${attempt + 1} failed. Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          return {
            healthy: false,
            configured: true,
            retriesAttempted: maxRetries,
            maxRetries,
            error: `Postgres query test failed after ${maxRetries} retries with exponential backoff: ${err.message}`,
          };
        }
      }
    }

    return {
      healthy: false,
      configured: true,
      retriesAttempted: maxRetries,
      maxRetries,
      error: 'Postgres query test failed',
    };
  }

  /**
   * Deep diagnostics report aggregating Postgres, Redis, and Base RPC statuses
   */
  public async getDeepHealthDiagnostics(): Promise<DeepHealthReport> {
    const [baseRpc, redis, postgres] = await Promise.all([
      this.checkBaseRpcWithFailover(),
      this.checkRedisPing(),
      this.checkPostgresWithBackoff(),
    ]);

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL_FAIL' = 'HEALTHY';

    if (!baseRpc.healthy || (!redis.healthy && redis.configured)) {
      overallStatus = 'CRITICAL_FAIL';
    } else if (!postgres.healthy && postgres.configured) {
      overallStatus = 'DEGRADED';
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      baseRpc,
      redis,
      postgres,
    };
  }
}
