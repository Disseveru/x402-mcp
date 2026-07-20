import * as crypto from 'crypto';
import { X402PaymentChallenge, X402PaymentProof, X402Receipt, X402Price } from './types';

export class X402Verifier {
  private secretKey: string;
  private payeeAddress: string;
  private settledInvoices: Map<string, X402Receipt> = new Map();
  private activeChallenges: Map<string, X402PaymentChallenge> = new Map();

  constructor(secretKey?: string, payeeAddress?: string) {
    this.secretKey = secretKey || process.env.X402_SECRET_KEY || 'agent_commerce_suite_secp256k1_hmac_secret_2026';
    if (process.env.NODE_ENV === 'production' && !process.env.X402_SECRET_KEY) {
      throw new Error('FATAL: X402_SECRET_KEY environment variable is missing in production');
    }
    this.payeeAddress = payeeAddress || process.env.MERCHANT_PAYMENT_ADDRESS || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  }

  /**
   * Generate an HTTP 402 Payment Challenge for a monetized service
   */
  public createChallenge(toolName: string, price: X402Price): X402PaymentChallenge {
    const invoiceId = `inv_${crypto.randomBytes(8).toString('hex')}`;
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    const payloadToHash = `${invoiceId}:${toolName}:${price.amount}:${price.currency}:${nonce}:${expiresAt}`;
    const challengeHash = crypto.createHmac('sha256', this.secretKey).update(payloadToHash).digest('hex');

    const challenge: X402PaymentChallenge = {
      protocol: 'x402',
      version: '1.0',
      invoiceId,
      toolName,
      payeeAddress: this.payeeAddress,
      price,
      expiresAt,
      nonce,
      challengeHash,
      paymentMethods: [
        {
          type: 'agent-wallet',
          endpoint: '/x402/pay',
          details: {
            network: process.env.X402_NETWORK || 'mainnet',
            token: price.currency,
          },
        },
        {
          type: 'lightning',
          endpoint: '/x402/lightning',
          details: {
            invoice: `lnbc${price.amount}n1p...${invoiceId}`,
          },
        },
      ],
    };

    this.activeChallenges.set(invoiceId, challenge);
    return challenge;
  }

  /**
   * Verify an incoming X402PaymentProof sent by an agent
   */
  public verifyProof(proof: X402PaymentProof): { valid: boolean; receipt?: X402Receipt; error?: string } {
    if (!proof || !proof.invoiceId) {
      return { valid: false, error: 'Missing invoiceId in payment proof' };
    }

    // Check if already settled (Replay protection)
    if (this.settledInvoices.has(proof.invoiceId)) {
      const existingReceipt = this.settledInvoices.get(proof.invoiceId)!;
      return { valid: true, receipt: existingReceipt };
    }

    const challenge = this.activeChallenges.get(proof.invoiceId);
    if (!challenge) {
      return { valid: false, error: 'Invoice expired or invalid' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.activeChallenges.delete(proof.invoiceId);
      return { valid: false, error: 'Invoice has expired' };
    }

    // Verify cryptographic signature: HMAC over (invoiceId + payerAddress + paymentHash + nonce)
    const expectedSigPayload = `${proof.invoiceId}:${proof.payerAddress}:${proof.paymentHash}:${proof.nonce}`;
    const expectedSignature = crypto.createHmac('sha256', this.secretKey).update(expectedSigPayload).digest('hex');

    let isValidHmac = false;
    try {
      isValidHmac = crypto.timingSafeEqual(
        Buffer.from(proof.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (e) {
      return { valid: false, error: 'Invalid signature format' };
    }

    if (!isValidHmac) {
      return { valid: false, error: 'Invalid cryptographic signature in payment proof' };
    }

    // Settlement success: Issue official receipt
    const txHash = `0x${crypto.createHash('sha256').update(proof.signature + proof.timestamp).digest('hex')}`;
    const receipt: X402Receipt = {
      receiptId: `rcpt_${crypto.randomBytes(8).toString('hex')}`,
      invoiceId: proof.invoiceId,
      toolName: challenge.toolName,
      payerAddress: proof.payerAddress,
      payeeAddress: challenge.payeeAddress,
      amountPaid: challenge.price,
      settledAt: Date.now(),
      status: 'SETTLED',
      transactionHash: txHash,
    };

    this.settledInvoices.set(proof.invoiceId, receipt);
    this.activeChallenges.delete(proof.invoiceId);

    return { valid: true, receipt };
  }

  /**
   * Helper to sign a payment proof on behalf of an agent client
   */
  public createAgentProof(invoiceId: string, payerAddress: string, paymentHash: string, nonce: string): string {
    const payload = `${invoiceId}:${payerAddress}:${paymentHash}:${nonce}`;
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  public getReceipt(invoiceId: string): X402Receipt | undefined {
    return this.settledInvoices.get(invoiceId);
  }
}

export const defaultVerifier = new X402Verifier();
