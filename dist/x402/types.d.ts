/**
 * x402 Protocol Types - Agent-to-Agent Payment Standard
 * Implements HTTP 402 Payment Required spec v2 for machine payments.
 */
export interface X402Price {
    amount: number;
    currency: string;
    formatted: string;
}
export interface X402PaymentChallenge {
    protocol: 'x402';
    version: '2.0' | '1.0';
    invoiceId: string;
    toolName: string;
    payeeAddress: string;
    price: X402Price;
    expiresAt: number;
    nonce: string;
    challengeHash: string;
    validatorMode?: boolean;
    paymentMethods: Array<{
        type: 'lightning' | 'evm' | 'solana' | 'agent-wallet';
        endpoint: string;
        details: Record<string, string>;
    }>;
}
export interface X402PaymentProof {
    invoiceId: string;
    payerAddress: string;
    paymentHash: string;
    signature: string;
    timestamp: number;
    nonce: string;
}
export interface X402Receipt {
    receiptId: string;
    invoiceId: string;
    toolName: string;
    payerAddress: string;
    payeeAddress: string;
    amountPaid: X402Price;
    settledAt: number;
    status: 'SETTLED' | 'PENDING' | 'REJECTED';
    transactionHash: string;
}
export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    receipt?: X402Receipt;
}
/**
 * Format helper for micro-pricing down to $0.001 USD and below
 */
export declare function formatX402Price(amount: number, currency?: string): X402Price;
/**
 * Normalizes price amounts to USD equivalent for accurate micro-pricing comparisons
 */
export declare function normalizeToUSD(price: X402Price): number;
