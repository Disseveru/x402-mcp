import { X402PaymentChallenge, X402PaymentProof, ServiceResponse } from './types';
import { X402Verifier } from './verifier';
import * as crypto from 'crypto';

export class AutonomousBuyerAgentClient {
  private payerAddress: string;
  private verifier: X402Verifier;

  constructor(payerAddress?: string, verifier?: X402Verifier) {
    this.payerAddress = payerAddress || '0xGeminiBuyerAgent_0x998877665544332211';
    this.verifier = verifier || new X402Verifier();
  }

  /**
   * Automatically handle HTTP 402 challenge negotiation and execute monetized calls
   */
  public async executeMonetizedCall<T>(
    toolCallFn: (paymentProof?: X402PaymentProof) => Promise<ServiceResponse<T> | any>
  ): Promise<ServiceResponse<T>> {
    // 1. Initial invocation attempt without payment proof
    const initialResult = await toolCallFn();

    // If initial call succeeded without payment, return directly
    if (initialResult && initialResult.success !== false && initialResult.status !== 402) {
      return { success: true, data: initialResult };
    }

    // 2. Extract Challenge if HTTP 402 received
    let challenge: X402PaymentChallenge | undefined;

    if (initialResult?.status === 402 && initialResult?.challenge) {
      challenge = initialResult.challenge;
    } else if (initialResult?.error && typeof initialResult.error === 'object') {
      challenge = initialResult.error.challenge;
    }

    if (!challenge) {
      throw new Error(`Execution failed and no 402 Payment Challenge returned: ${JSON.stringify(initialResult)}`);
    }

    console.log(`[BuyerAgent] Received 402 Payment Required for tool '${challenge.toolName}'. Required: ${challenge.price.formatted}`);

    // 3. Resolve Payment & Generate Cryptographic Proof
    const paymentHash = `tx_hash_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = Date.now();
    const signature = this.verifier.createAgentProof(
      challenge.invoiceId,
      this.payerAddress,
      paymentHash,
      challenge.nonce
    );

    const paymentProof: X402PaymentProof = {
      invoiceId: challenge.invoiceId,
      payerAddress: this.payerAddress,
      paymentHash,
      signature,
      timestamp,
      nonce: challenge.nonce,
    };

    console.log(`[BuyerAgent] Generated x402 payment proof for invoice ${challenge.invoiceId}. Retrying tool execution...`);

    // 4. Retry call with valid payment proof attached
    const settledResult = await toolCallFn(paymentProof);
    return settledResult;
  }

  /**
   * Helper to format payment proof header for HTTP fetch calls
   */
  public createProofHeader(proof: X402PaymentProof): { 'X-402-Payment-Proof': string } {
    const base64Proof = Buffer.from(JSON.stringify(proof)).toString('base64');
    return {
      'X-402-Payment-Proof': base64Proof,
    };
  }
}
