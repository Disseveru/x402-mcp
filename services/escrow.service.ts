import { X402Price } from '../x402/types';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export interface EscrowContractInput {
  buyerAgent: string;
  sellerAgent: string;
  amountUSD: number;
  conditions: string;
  expiryMinutes?: number;
}

export interface EscrowContractState {
  escrowId: string;
  buyerAgent: string;
  sellerAgent: string;
  amountUSD: number;
  status: 'PENDING_DEPOSIT' | 'FUNDS_LOCKED' | 'SETTLED' | 'DISPUTED' | 'REFUNDED';
  conditions: string;
  createdAt: number;
  expiresAt: number;
  fundingTxHash?: string;
  settlementProof?: string;
}

export class EscrowService {
  public static readonly FEE_PRICE: X402Price = {
    amount: 25,
    currency: 'USD_CENT',
    formatted: '$0.25 USD',
  };

  private redis: Redis | null = null;
  private useMemoryFallback = false;
  private escrowsFallback = new Map<string, EscrowContractState>();

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('error', (err) => {
        console.error('Redis error in EscrowService:', err);
      });
    } else {
      this.useMemoryFallback = true;
      console.warn('REDIS_URL not set. EscrowService will use in-memory fallback.');
    }
  }

  public async createEscrow(input: EscrowContractInput): Promise<EscrowContractState> {
    const escrowId = `esc_${crypto.randomBytes(6).toString('hex')}`;
    const createdAt = Date.now();
    const expiresAt = createdAt + (input.expiryMinutes || 60) * 60 * 1000;

    const escrow: EscrowContractState = {
      escrowId,
      buyerAgent: input.buyerAgent,
      sellerAgent: input.sellerAgent,
      amountUSD: input.amountUSD,
      status: 'FUNDS_LOCKED', // Auto-lock upon x402 payment
      conditions: input.conditions,
      createdAt,
      expiresAt,
      fundingTxHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    };

    if (this.redis && !this.useMemoryFallback) {
      await this.redis.set(`escrow:${escrowId}`, JSON.stringify(escrow));
    } else {
      this.escrowsFallback.set(escrowId, escrow);
    }
    
    return escrow;
  }

  public async releaseEscrow(escrowId: string, proofOfDelivery: string): Promise<EscrowContractState> {
    const escrow = await this.getEscrow(escrowId);
    
    if (!escrow) {
      throw new Error(`Escrow with ID ${escrowId} not found`);
    }

    if (escrow.status !== 'FUNDS_LOCKED') {
      throw new Error(`Escrow cannot be released from status: ${escrow.status}`);
    }

    if (!proofOfDelivery || proofOfDelivery.trim() === '') {
      throw new Error('Invalid proof of delivery');
    }

    escrow.status = 'SETTLED';
    escrow.settlementProof = proofOfDelivery;
    
    if (this.redis && !this.useMemoryFallback) {
      await this.redis.set(`escrow:${escrowId}`, JSON.stringify(escrow));
    } else {
      this.escrowsFallback.set(escrowId, escrow);
    }
    
    return escrow;
  }

  public async getEscrow(escrowId: string): Promise<EscrowContractState | undefined> {
    if (this.redis && !this.useMemoryFallback) {
      const data = await this.redis.get(`escrow:${escrowId}`);
      if (data) {
        return JSON.parse(data) as EscrowContractState;
      }
      return undefined;
    }
    return this.escrowsFallback.get(escrowId);
  }
}
