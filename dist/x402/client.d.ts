import { X402PaymentProof, ServiceResponse } from './types';
import { X402Verifier } from './verifier';
export declare class AutonomousBuyerAgentClient {
    private payerAddress;
    private verifier;
    constructor(payerAddress?: string, verifier?: X402Verifier);
    /**
     * Automatically handle HTTP 402 challenge negotiation and execute monetized calls
     */
    executeMonetizedCall<T>(toolCallFn: (paymentProof?: X402PaymentProof) => Promise<ServiceResponse<T> | any>): Promise<ServiceResponse<T>>;
    /**
     * Helper to format payment proof header for HTTP fetch calls
     */
    createProofHeader(proof: X402PaymentProof): {
        'X-402-Payment-Proof': string;
    };
}
