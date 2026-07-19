/**
 * x402 Protocol Types - Agent-to-Agent Payment Standard
 * Implements HTTP 402 Payment Required spec for machine payments.
 */

export interface X402Price {
  amount: number;       // Amount in satoshis / wei / micro-tokens
  currency: string;     // USD, SATS, WEI, AGENT
  formatted: string;    // e.g. "$0.05 USD" or "50 SATS"
}

export interface X402PaymentChallenge {
  protocol: 'x402';
  version: '1.0';
  invoiceId: string;
  toolName: string;
  payeeAddress: string;
  price: X402Price;
  expiresAt: number;     // Unix timestamp in ms
  nonce: string;
  challengeHash: string;
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
  signature: string;      // Cryptographic signature proving payment or pre-auth authorization
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
