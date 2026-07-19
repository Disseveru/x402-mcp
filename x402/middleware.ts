import { Request, Response, NextFunction } from 'express';
import { X402Verifier, defaultVerifier } from './verifier';
import { X402Price, X402PaymentProof, X402Receipt } from './types';

export interface X402Request extends Request {
  x402Receipt?: X402Receipt;
}

/**
 * Express Middleware enforcing HTTP 402 Payment Required for API endpoints
 */
export function requireX402Payment(
  toolName: string,
  price: X402Price,
  verifier: X402Verifier = defaultVerifier
) {
  return (req: X402Request, res: Response, next: NextFunction) => {
    const proofHeader = req.header('X-402-Payment-Proof') || req.header('x-402-payment-proof');

    if (proofHeader) {
      try {
        const proof: X402PaymentProof = JSON.parse(
          Buffer.from(proofHeader, 'base64').toString('utf-8')
        );

        const verification = verifier.verifyProof(proof);
        if (verification.valid && verification.receipt) {
          req.x402Receipt = verification.receipt;
          res.setHeader('X-402-Receipt', JSON.stringify(verification.receipt));
          return next();
        } else {
          res.status(402).json({
            error: 'Payment verification failed',
            details: verification.error,
          });
          return;
        }
      } catch (err) {
        res.status(400).json({ error: 'Malformed X-402-Payment-Proof header format' });
        return;
      }
    }

    // No proof provided -> Issue HTTP 402 Payment Challenge
    const challenge = verifier.createChallenge(toolName, price);
    const encodedChallenge = Buffer.from(JSON.stringify(challenge)).toString('base64');

    res.setHeader('X-402-Payment-Required', encodedChallenge);
    res.setHeader('WWW-Authenticate', `x402 challenge="${challenge.challengeHash}"`);
    
    res.status(402).json({
      status: 402,
      message: `Payment Required: ${toolName} requires payment of ${price.formatted}`,
      challenge,
    });
  };
}

/**
 * Programmatic check for MCP Tools / non-HTTP RPC execution
 */
export function validateOrChallengeX402(
  toolName: string,
  price: X402Price,
  paymentProof?: X402PaymentProof,
  verifier: X402Verifier = defaultVerifier
): { success: true; receipt: X402Receipt } | { success: false; status: 402; challenge: any } {
  if (paymentProof) {
    const verification = verifier.verifyProof(paymentProof);
    if (verification.valid && verification.receipt) {
      return { success: true, receipt: verification.receipt };
    }
  }

  const challenge = verifier.createChallenge(toolName, price);
  return {
    success: false,
    status: 402,
    challenge,
  };
}
