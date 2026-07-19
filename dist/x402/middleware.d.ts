import { Request, Response, NextFunction } from 'express';
import { X402Verifier } from './verifier';
import { X402Price, X402PaymentProof, X402Receipt } from './types';
export interface X402Request extends Request {
    x402Receipt?: X402Receipt;
}
/**
 * Express Middleware enforcing HTTP 402 Payment Required for API endpoints
 */
export declare function requireX402Payment(toolName: string, price: X402Price, verifier?: X402Verifier): (req: X402Request, res: Response, next: NextFunction) => void;
/**
 * Programmatic check for MCP Tools / non-HTTP RPC execution
 */
export declare function validateOrChallengeX402(toolName: string, price: X402Price, paymentProof?: X402PaymentProof, verifier?: X402Verifier): {
    success: true;
    receipt: X402Receipt;
} | {
    success: false;
    status: 402;
    challenge: any;
};
