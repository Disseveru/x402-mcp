import { X402PaymentChallenge, X402PaymentProof, X402Receipt, X402Price } from './types';
export declare class X402Verifier {
    private secretKey;
    private payeeAddress;
    private settledInvoices;
    private activeChallenges;
    constructor(secretKey?: string, payeeAddress?: string);
    /**
     * Generate an HTTP 402 Payment Challenge for a monetized service (x402 v2 protocol)
     */
    createChallenge(toolName: string, price: X402Price, options?: {
        isValidator?: boolean;
    }): X402PaymentChallenge;
    /**
     * Verify an incoming X402PaymentProof sent by an agent
     */
    verifyProof(proof: X402PaymentProof): {
        valid: boolean;
        receipt?: X402Receipt;
        error?: string;
    };
    /**
     * Helper to sign a payment proof on behalf of an agent client
     */
    createAgentProof(invoiceId: string, payerAddress: string, paymentHash: string, nonce: string): string;
    getReceipt(invoiceId: string): X402Receipt | undefined;
}
export declare const defaultVerifier: X402Verifier;
