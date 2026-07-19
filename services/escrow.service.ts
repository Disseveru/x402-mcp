import { X402Price } from '../x402/types';
import * as crypto from 'crypto';

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

  private escrows: Map<string, EscrowContractState> = new Map();

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

    this.escrows.set(escrowId, escrow);
    return escrow;
  }

  public async releaseEscrow(escrowId: string, proofOfDelivery: string): Promise<EscrowContractState> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error(`Escrow with ID ${escrowId} not found`);
    }

    if (escrow.status !== 'FUNDS_LOCKED') {
      throw new Error(`Escrow cannot be released from status: ${escrow.status}`);
    }

    escrow.status = 'SETTLED';
    escrow.settlementProof = proofOfDelivery;
    this.escrows.set(escrowId, escrow);
    return escrow;
  }

  public getEscrow(escrowId: string): EscrowContractState | undefined {
    return this.escrows.get(escrowId);
  }
}
