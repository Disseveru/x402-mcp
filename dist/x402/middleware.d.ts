import { Request, Response, NextFunction } from 'express';
import { X402Verifier } from './verifier';
import { X402Price, X402PaymentProof, X402Receipt } from './types';
export interface X402Request extends Request {
    x402Receipt?: X402Receipt;
    isValidator?: boolean;
}
/**
 * Detects if request is in Agentic Market validator auto-indexing mode (?validator=true or X-Validator header)
 */
export declare function isValidatorRequest(req: Request): boolean;
/**
 * Express Middleware enforcing HTTP 402 Payment Required for API endpoints.
 * MUST be executed before any auth middleware so unauthenticated requests receive 402 for x402 discovery.
 */
export declare function requireX402Payment(toolName: string, price: X402Price, verifier?: X402Verifier): (req: X402Request, res: Response, next: NextFunction) => void;
/**
 * Universal x402 Express Middleware that runs BEFORE any auth middleware.
 * Returns HTTP 402 for unauthenticated requests.
 */
export declare function x402ExpressMiddleware(verifier?: X402Verifier): (req: X402Request, res: Response, next: NextFunction) => void;
/**
 * Programmatic check for MCP Tools / non-HTTP RPC execution
 */
export declare function validateOrChallengeX402(toolName: string, price: X402Price, paymentProof?: X402PaymentProof, verifier?: X402Verifier, options?: {
    isValidator?: boolean;
}): {
    success: true;
    receipt: X402Receipt;
} | {
    success: false;
    status: 402;
    challenge: any;
};
