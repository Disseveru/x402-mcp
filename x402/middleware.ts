import { Request, Response, NextFunction } from 'express';
import { X402Verifier, defaultVerifier } from './verifier';
import { X402Price, X402PaymentProof, X402Receipt } from './types';

export interface X402Request extends Request {
  x402Receipt?: X402Receipt;
}

/**
 * Express Middleware enforcing HTTP 402 Payment Required for API endpoints.
 * MUST be executed before any auth middleware so unauthenticated requests receive 402 for x402 discovery.
 */
export function requireX402Payment(
  toolName: string,
  price: X402Price,
  verifier: X402Verifier = defaultVerifier
) {
  return (req: X402Request, res: Response, next: NextFunction) => {
    const proofHeader =
      req.header('X-402-Payment-Proof') ||
      req.header('x-402-payment-proof') ||
      req.header('payment-proof') ||
      req.header('Authorization');

    if (proofHeader) {
      try {
        const rawHeader = proofHeader.startsWith('Bearer ')
          ? proofHeader.slice(7)
          : proofHeader.startsWith('x402 ')
          ? proofHeader.slice(5)
          : proofHeader;

        const proof: X402PaymentProof = JSON.parse(
          Buffer.from(rawHeader, 'base64').toString('utf-8')
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

    res.setHeader('PAYMENT-REQUIRED', encodedChallenge);
    res.setHeader('Payment-Required', encodedChallenge);
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
 * Universal x402 Express Middleware that runs BEFORE any auth middleware.
 * Returns HTTP 402 for unauthenticated requests.
 */
export function x402ExpressMiddleware(verifier: X402Verifier = defaultVerifier) {
  return (req: X402Request, res: Response, next: NextFunction) => {
    const proofHeader =
      req.header('X-402-Payment-Proof') ||
      req.header('x-402-payment-proof') ||
      req.header('payment-proof') ||
      req.header('Authorization');

    let proof: X402PaymentProof | undefined = undefined;

    if (proofHeader) {
      try {
        const rawHeader = proofHeader.startsWith('Bearer ')
          ? proofHeader.slice(7)
          : proofHeader.startsWith('x402 ')
          ? proofHeader.slice(5)
          : proofHeader;
        proof = JSON.parse(Buffer.from(rawHeader, 'base64').toString('utf-8'));
      } catch (err) {
        try {
          proof = JSON.parse(proofHeader);
        } catch (_) {}
      }
    }

    if (!proof && req.body && req.body.paymentProof) {
      proof = req.body.paymentProof;
    }

    if (proof) {
      const verification = verifier.verifyProof(proof);
      if (verification.valid && verification.receipt) {
        req.x402Receipt = verification.receipt;
        res.setHeader('X-402-Receipt', JSON.stringify(verification.receipt));
        return next();
      }
    }

    // Unauthenticated request -> Return 402 Payment Required for discovery
    const toolName =
      req.body?.tool ||
      req.body?.function ||
      req.body?.name ||
      (req.query?.tool as string) ||
      'market_data_insights';

    const price: X402Price = {
      amount: 50,
      currency: 'USD_CENT',
      formatted: '$0.50 USD',
    };

    const challenge = verifier.createChallenge(toolName, price);
    const encodedChallenge = Buffer.from(JSON.stringify(challenge)).toString('base64');

    res.setHeader('PAYMENT-REQUIRED', encodedChallenge);
    res.setHeader('Payment-Required', encodedChallenge);
    res.setHeader('X-402-Payment-Required', encodedChallenge);
    res.setHeader('WWW-Authenticate', `x402 challenge="${challenge.challengeHash}"`);

    res.status(402).json({
      success: false,
      status: 402,
      error: 'PAYMENT_REQUIRED',
      message: `Payment Required: unauthenticated request to ${toolName}`,
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

