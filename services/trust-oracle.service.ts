import { X402Price } from '../x402/types';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export interface AgentTransactionRecord {
  txId: string;
  buyerAgent: string;
  sellerAgent: string;
  amountUSD: number;
  status: 'SUCCESS' | 'FAILED' | 'DISPUTED';
  latencyMs: number;
  slaMet: boolean;
  promptInjectionDetected: boolean;
  timestamp: number;
}

export interface AgentTrustQueryInput {
  agentId: string;
  timeWindowDays?: number;
  forceRecalculate?: boolean;
}

export interface AgentTrustMetrics {
  agentId: string;
  reputationScore: number; // 0.00 to 100.00
  trustTier: 'ELITE' | 'VERIFIED' | 'NEUTRAL' | 'HIGH_RISK' | 'UNTRUSTED';
  slaComplianceRate: number; // 0.00 to 100.00 %
  promptInjectionThreatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  settledVolumeUSD: number;
  totalTransactions: number;
  successfulTransactions: number;
  disputedTransactions: number;
  averageLatencyMs: number;
  threatCount: number;
  riskFactors: string[];
  lastEvaluatedAt: number;
}

export interface RecordTransactionInput {
  agentId: string;
  counterpartyAgent?: string;
  amountUSD: number;
  status: 'SUCCESS' | 'FAILED' | 'DISPUTED';
  latencyMs: number;
  slaMet: boolean;
  promptInjectionAttempt?: boolean;
}

export class AgentTrustOracleService {
  public static readonly PRICE: X402Price = {
    amount: 35,
    currency: 'USD_CENT',
    formatted: '$0.35 USD',
  };

  private redis: Redis | null = null;
  private useMemoryFallback = false;

  // In-memory fallback stores
  private metricsMemoryMap = new Map<string, AgentTrustMetrics>();
  private historyMemoryMap = new Map<string, AgentTransactionRecord[]>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) => {
        console.error('Redis error in AgentTrustOracleService:', err);
      });
    } else {
      this.useMemoryFallback = true;
    }
  }

  /**
   * Retrieves or computes real-time trust metrics for a target agent.
   */
  public async getTrustMetrics(input: AgentTrustQueryInput): Promise<AgentTrustMetrics> {
    const { agentId, timeWindowDays = 30, forceRecalculate = false } = input;

    if (!agentId || agentId.trim() === '') {
      throw new Error('Agent ID is required to fetch trust metrics');
    }

    if (!forceRecalculate) {
      const cached = await this.getCachedMetrics(agentId);
      if (cached) {
        return cached;
      }
    }

    // Compute fresh metrics based on recorded transaction history
    const history = await this.getTransactionHistory(agentId);
    const metrics = this.computeMetricsFromHistory(agentId, history, timeWindowDays);

    await this.saveMetrics(agentId, metrics);
    return metrics;
  }

  /**
   * Records a completed agent-to-agent transaction and updates reputation state.
   */
  public async recordTransaction(input: RecordTransactionInput): Promise<AgentTrustMetrics> {
    const {
      agentId,
      counterpartyAgent = 'anonymous_agent',
      amountUSD,
      status,
      latencyMs,
      slaMet,
      promptInjectionAttempt = false,
    } = input;

    if (!agentId) {
      throw new Error('Agent ID is required to record transaction');
    }

    const txRecord: AgentTransactionRecord = {
      txId: `tx_${crypto.randomBytes(6).toString('hex')}`,
      buyerAgent: agentId,
      sellerAgent: counterpartyAgent,
      amountUSD: Math.max(0, amountUSD),
      status,
      latencyMs: Math.max(0, latencyMs),
      slaMet,
      promptInjectionDetected: Boolean(promptInjectionAttempt),
      timestamp: Date.now(),
    };

    const history = await this.getTransactionHistory(agentId);
    history.push(txRecord);

    await this.saveTransactionHistory(agentId, history);

    // Recalculate metrics immediately
    const updatedMetrics = this.computeMetricsFromHistory(agentId, history, 30);
    await this.saveMetrics(agentId, updatedMetrics);

    return updatedMetrics;
  }

  /**
   * Pure scoring math algorithm.
   */
  private computeMetricsFromHistory(
    agentId: string,
    history: AgentTransactionRecord[],
    windowDays: number
  ): AgentTrustMetrics {
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const windowHistory = history.filter((h) => h.timestamp >= cutoff);

    if (windowHistory.length === 0) {
      return {
        agentId,
        reputationScore: 50.0,
        trustTier: 'NEUTRAL',
        slaComplianceRate: 100.0,
        promptInjectionThreatLevel: 'NONE',
        settledVolumeUSD: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        disputedTransactions: 0,
        averageLatencyMs: 0,
        threatCount: 0,
        riskFactors: ['NO_TRANSACTION_HISTORY_AVAILABLE'],
        lastEvaluatedAt: Date.now(),
      };
    }

    const totalTransactions = windowHistory.length;
    let successfulTransactions = 0;
    let disputedTransactions = 0;
    let slaMetCount = 0;
    let settledVolumeUSD = 0;
    let totalLatency = 0;
    let threatCount = 0;

    for (const tx of windowHistory) {
      if (tx.status === 'SUCCESS') {
        successfulTransactions++;
        settledVolumeUSD += tx.amountUSD;
      } else if (tx.status === 'DISPUTED') {
        disputedTransactions++;
      }

      if (tx.slaMet) {
        slaMetCount++;
      }

      totalLatency += tx.latencyMs;

      if (tx.promptInjectionDetected) {
        threatCount++;
      }
    }

    const slaComplianceRate = Number(
      ((slaMetCount / totalTransactions) * 100).toFixed(2)
    );
    const successRate = successfulTransactions / totalTransactions;
    const averageLatencyMs = Math.round(totalLatency / totalTransactions);

    // --- Scoring Weights ---
    // 1. Success Rate Component (0 - 40 points)
    const successPoints = successRate * 40;

    // 2. SLA Compliance Component (0 - 25 points)
    const slaPoints = (slaMetCount / totalTransactions) * 25;

    // 3. Volume Factor (0 - 20 points, logarithmic scaling up to $10,000 USD)
    const volumePoints = Math.min(20, Math.log10(1 + settledVolumeUSD) * 5);

    // 4. Latency Bonus / Penalty (0 - 15 points)
    let latencyPoints = 15;
    if (averageLatencyMs > 5000) {
      latencyPoints = 0;
    } else if (averageLatencyMs > 2000) {
      latencyPoints = 5;
    } else if (averageLatencyMs > 1000) {
      latencyPoints = 10;
    }

    // Penalties
    const promptInjectionPenalty = threatCount * 20;
    const disputePenalty = disputedTransactions * 15;

    const rawScore =
      successPoints + slaPoints + volumePoints + latencyPoints - promptInjectionPenalty - disputePenalty;

    const reputationScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(2));

    // Threat level calculation
    let promptInjectionThreatLevel: AgentTrustMetrics['promptInjectionThreatLevel'] = 'NONE';
    if (threatCount >= 5) {
      promptInjectionThreatLevel = 'CRITICAL';
    } else if (threatCount >= 3) {
      promptInjectionThreatLevel = 'HIGH';
    } else if (threatCount >= 2) {
      promptInjectionThreatLevel = 'MEDIUM';
    } else if (threatCount === 1) {
      promptInjectionThreatLevel = 'LOW';
    }

    // Risk factors identification
    const riskFactors: string[] = [];
    if (threatCount > 0) {
      riskFactors.push(`PROMPT_INJECTION_ATTEMPTS_DETECTED (${threatCount})`);
    }
    if (disputedTransactions > 0) {
      riskFactors.push(`DISPUTED_TRANSACTIONS_ON_RECORD (${disputedTransactions})`);
    }
    if (slaComplianceRate < 80) {
      riskFactors.push(`LOW_SLA_COMPLIANCE_RATE (${slaComplianceRate}%)`);
    }
    if (averageLatencyMs > 3000) {
      riskFactors.push(`HIGH_AVERAGE_LATENCY (${averageLatencyMs}ms)`);
    }
    if (totalTransactions < 5) {
      riskFactors.push('LOW_SAMPLE_SIZE_UNVERIFIED_AGENT');
    }

    // Trust tier calculation
    let trustTier: AgentTrustMetrics['trustTier'] = 'NEUTRAL';
    if (reputationScore >= 90 && promptInjectionThreatLevel === 'NONE' && totalTransactions >= 10) {
      trustTier = 'ELITE';
    } else if (reputationScore >= 75 && promptInjectionThreatLevel !== 'HIGH' && promptInjectionThreatLevel !== 'CRITICAL') {
      trustTier = 'VERIFIED';
    } else if (reputationScore < 30 || promptInjectionThreatLevel === 'CRITICAL') {
      trustTier = 'UNTRUSTED';
    } else if (reputationScore < 55 || promptInjectionThreatLevel === 'HIGH') {
      trustTier = 'HIGH_RISK';
    }

    return {
      agentId,
      reputationScore,
      trustTier,
      slaComplianceRate,
      promptInjectionThreatLevel,
      settledVolumeUSD: Number(settledVolumeUSD.toFixed(2)),
      totalTransactions,
      successfulTransactions,
      disputedTransactions,
      averageLatencyMs,
      threatCount,
      riskFactors,
      lastEvaluatedAt: Date.now(),
    };
  }

  // --- Persistence Handlers ---

  private async getCachedMetrics(agentId: string): Promise<AgentTrustMetrics | null> {
    if (this.redis && !this.useMemoryFallback) {
      const data = await this.redis.get(`trust:metrics:${agentId}`);
      if (data) return JSON.parse(data);
    }
    return this.metricsMemoryMap.get(agentId) || null;
  }

  private async saveMetrics(agentId: string, metrics: AgentTrustMetrics): Promise<void> {
    if (this.redis && !this.useMemoryFallback) {
      await this.redis.set(`trust:metrics:${agentId}`, JSON.stringify(metrics), 'EX', 86400); // 24h cache
    } else {
      this.metricsMemoryMap.set(agentId, metrics);
    }
  }

  private async getTransactionHistory(agentId: string): Promise<AgentTransactionRecord[]> {
    if (this.redis && !this.useMemoryFallback) {
      const data = await this.redis.get(`trust:history:${agentId}`);
      if (data) return JSON.parse(data);
      return [];
    }
    return this.historyMemoryMap.get(agentId) || [];
  }

  private async saveTransactionHistory(agentId: string, history: AgentTransactionRecord[]): Promise<void> {
    if (this.redis && !this.useMemoryFallback) {
      await this.redis.set(`trust:history:${agentId}`, JSON.stringify(history));
    } else {
      this.historyMemoryMap.set(agentId, history);
    }
  }
}
