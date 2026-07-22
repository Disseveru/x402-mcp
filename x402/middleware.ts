import { Request, Response, NextFunction } from 'express';
import { X402Verifier, defaultVerifier } from './verifier';
import { X402Price, X402PaymentProof, X402Receipt, normalizeToUSD } from './types';

export interface X402Request extends Request {
  x402Receipt?: X402Receipt;
  isValidator?: boolean;
}

/**
 * Detects if request is in Agentic Market validator auto-indexing mode (?validator=true or X-Validator header)
 */
export function isValidatorRequest(req: Request): boolean {
  const queryVal = req.query?.validator;
  const headerVal = req.header('X-Validator') || req.header('x-validator');
  return (
    queryVal === 'true' ||
    queryVal === '1' ||
    headerVal === 'true' ||
    headerVal === '1' ||
    Boolean(headerVal)
  );
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
    const isValidator = isValidatorRequest(req);
    req.isValidator = isValidator;

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

        let proof: X402PaymentProof;
        try {
          proof = JSON.parse(Buffer.from(rawHeader, 'base64').toString('utf-8'));
        } catch (_) {
          proof = JSON.parse(rawHeader);
        }

        const verification = verifier.verifyProof(proof);
        if (verification.valid && verification.receipt) {
          req.x402Receipt = verification.receipt;
          res.setHeader('X-402-Receipt', JSON.stringify(verification.receipt));
          return next();
        } else {
          res.status(402).json({
            status: 402,
            error: 'PAYMENT_REQUIRED',
            message: 'Payment verification failed',
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
    const challenge = verifier.createChallenge(toolName, price, { isValidator });
    const encodedChallenge = Buffer.from(JSON.stringify(challenge)).toString('base64');

    res.setHeader('PAYMENT-REQUIRED', encodedChallenge);
    res.setHeader('Payment-Required', encodedChallenge);
    res.setHeader('X-402-Payment-Required', encodedChallenge);
    res.setHeader('WWW-Authenticate', `x402 challenge="${challenge.challengeHash}"`);

    if (isValidator) {
      res.setHeader('X-Validator-Indexing', 'active');
      res.setHeader('X-Validator-Status', 'indexed');
    }

    res.status(402).json({
      status: 402,
      error: 'PAYMENT_REQUIRED',
      message: `Payment Required: ${toolName} requires payment of ${price.formatted}`,
      challenge,
      ...(isValidator ? { validatorMode: true, indexed: true } : {}),
    });
  };
}

/**
 * Universal x402 Express Middleware that runs BEFORE any auth middleware.
 * Returns HTTP 402 for unauthenticated requests.
 */
export function x402ExpressMiddleware(verifier: X402Verifier = defaultVerifier) {
  return (req: X402Request, res: Response, next: NextFunction) => {
    const isValidator = isValidatorRequest(req);
    req.isValidator = isValidator;

    // Validator auto-indexing mode bypasses free mode to allow 402 challenge inspection
    const isFreeMode = process.env.X402_FREE_MODE === 'true' && !isValidator;

    if (isFreeMode) {
      req.x402Receipt = {
        receiptId: `free_rcpt_${Date.now()}`,
        invoiceId: `free_inv_${Date.now()}`,
        toolName: req.body?.tool || 'free_service',
        payerAddress: '0x0000000000000000000000000000000000000000',
        payeeAddress: process.env.MERCHANT_PAYMENT_ADDRESS || '0x090Ee2c244cE54E6200b3B84d52d3C62d3b9DD26',
        amountPaid: { amount: 0, currency: 'USD_CENT', formatted: '$0.00 FREE TIER' },
        settledAt: Date.now(),
        status: 'SETTLED',
        transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
      res.setHeader('X-402-Receipt', JSON.stringify(req.x402Receipt));
      return next();
    }

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

    if (!proof && req.body && (req.body.paymentProof || req.body.payment_proof)) {
      proof = req.body.paymentProof || req.body.payment_proof;
    }

    if (proof) {
      const verification = verifier.verifyProof(proof);
      if (verification.valid && verification.receipt) {
        req.x402Receipt = verification.receipt;
        res.setHeader('X-402-Receipt', JSON.stringify(verification.receipt));
        return next();
      }
    }

    const toolName =
      req.body?.tool ||
      req.body?.function ||
      req.body?.name ||
      (req.query?.tool as string) ||
      'generic_mcp_endpoint';

    const price: X402Price = {
      amount: 0.001,
      currency: 'USD',
      formatted: '$0.001 USD',
    };

    const challenge = verifier.createChallenge(toolName, price, { isValidator });
    const encodedChallenge = Buffer.from(JSON.stringify(challenge)).toString('base64');

    res.setHeader('PAYMENT-REQUIRED', encodedChallenge);
    res.setHeader('Payment-Required', encodedChallenge);
    res.setHeader('X-402-Payment-Required', encodedChallenge);
    res.setHeader('WWW-Authenticate', `x402 challenge="${challenge.challengeHash}"`);

    if (isValidator) {
      res.setHeader('X-Validator-Indexing', 'active');
      res.setHeader('X-Validator-Status', 'indexed');
    }

    res.status(402).json({
      success: false,
      status: 402,
      error: 'PAYMENT_REQUIRED',
      message: `Payment Required: unauthenticated request to ${toolName}`,
      challenge,
      ...(isValidator ? { validatorMode: true, indexed: true } : {}),
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
  verifier: X402Verifier = defaultVerifier,
  options?: { isValidator?: boolean }
): { success: true; receipt: X402Receipt } | { success: false; status: 402; challenge: any } {
  const isValidator = options?.isValidator || false;
  const isFreeMode = process.env.X402_FREE_MODE === 'true' && !isValidator;

  if (isFreeMode) {
    return {
      success: true,
      receipt: {
        receiptId: `free_rcpt_${Date.now()}`,
        invoiceId: `free_inv_${Date.now()}`,
        toolName,
        payerAddress: '0x0000000000000000000000000000000000000000',
        payeeAddress: process.env.MERCHANT_PAYMENT_ADDRESS || '0x090Ee2c244cE54E6200b3B84d52d3C62d3b9DD26',
        amountPaid: { amount: 0, currency: 'USD_CENT', formatted: '$0.00 FREE TIER' },
        settledAt: Date.now(),
        status: 'SETTLED',
        transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      },
    };
  }

  if (paymentProof) {
    const verification = verifier.verifyProof(paymentProof);
    if (verification.valid && verification.receipt) {
      const receipt = verification.receipt;
      if (normalizeToUSD(receipt.amountPaid) >= normalizeToUSD(price)) {
        return { success: true, receipt };
      }
    }
  }

  const challenge = verifier.createChallenge(toolName, price, { isValidator });
  return {
    success: false,
    status: 402,
    challenge,
  };
}


