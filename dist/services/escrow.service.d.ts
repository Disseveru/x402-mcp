import { X402Price } from '../x402/types';
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
export declare class EscrowService {
    static readonly FEE_PRICE: X402Price;
    private escrows;
    createEscrow(input: EscrowContractInput): Promise<EscrowContractState>;
    releaseEscrow(escrowId: string, proofOfDelivery: string): Promise<EscrowContractState>;
    getEscrow(escrowId: string): EscrowContractState | undefined;
}
