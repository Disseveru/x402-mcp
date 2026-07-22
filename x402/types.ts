/**
 * x402 Protocol Types - Agent-to-Agent Payment Standard
 * Implements HTTP 402 Payment Required spec v2 for machine payments.
 */

export interface X402Price {
  amount: number;       // Amount in satoshis / wei / micro-tokens / USD / cents / micro-USD
  currency: string;     // USD, SATS, WEI, AGENT, USD_CENT, USD_MICRO
  formatted: string;    // e.g. "$0.001 USD" or "$0.05 USD" or "50 SATS"
}

export interface X402PaymentChallenge {
  protocol: 'x402';
  version: '2.0' | '1.0';
  invoiceId: string;
  toolName: string;
  payeeAddress: string;
  price: X402Price;
  expiresAt: number;     // Unix timestamp in ms
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

/**
 * Format helper for micro-pricing down to $0.001 USD and below
 */
export function formatX402Price(amount: number, currency: string = 'USD'): X402Price {
  let formatted = '';
  if (currency === 'USD') {
    if (amount < 0.01) {
      formatted = `$${amount.toFixed(3)} USD`;
    } else {
      formatted = `$${amount.toFixed(2)} USD`;
    }
  } else if (currency === 'USD_CENT') {
    const usdAmount = amount / 100;
    if (usdAmount < 0.01) {
      formatted = `$${usdAmount.toFixed(3)} USD`;
    } else {
      formatted = `$${usdAmount.toFixed(2)} USD`;
    }
  } else if (currency === 'USD_MICRO') {
    const usdAmount = amount / 1000000;
    formatted = `$${usdAmount.toFixed(4)} USD`;
  } else {
    formatted = `${amount} ${currency}`;
  }
  return { amount, currency, formatted };
}

/**
 * Normalizes price amounts to USD equivalent for accurate micro-pricing comparisons
 */
export function normalizeToUSD(price: X402Price): number {
  if (price.currency === 'USD') return price.amount;
  if (price.currency === 'USD_CENT') return price.amount / 100;
  if (price.currency === 'USD_MICRO') return price.amount / 1000000;
  return price.amount;
}

