"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireX402Payment = requireX402Payment;
exports.x402ExpressMiddleware = x402ExpressMiddleware;
exports.validateOrChallengeX402 = validateOrChallengeX402;
const verifier_1 = require("./verifier");
/**
 * Express Middleware enforcing HTTP 402 Payment Required for API endpoints.
 * MUST be executed before any auth middleware so unauthenticated requests receive 402 for x402 discovery.
 */
function requireX402Payment(toolName, price, verifier = verifier_1.defaultVerifier) {
    return (req, res, next) => {
        const proofHeader = req.header('X-402-Payment-Proof') ||
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
                const proof = JSON.parse(Buffer.from(rawHeader, 'base64').toString('utf-8'));
                const verification = verifier.verifyProof(proof);
                if (verification.valid && verification.receipt) {
                    req.x402Receipt = verification.receipt;
                    res.setHeader('X-402-Receipt', JSON.stringify(verification.receipt));
                    return next();
                }
                else {
                    res.status(402).json({
                        error: 'Payment verification failed',
                        details: verification.error,
                    });
                    return;
                }
            }
            catch (err) {
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
function x402ExpressMiddleware(verifier = verifier_1.defaultVerifier) {
    return (req, res, next) => {
        const proofHeader = req.header('X-402-Payment-Proof') ||
            req.header('x-402-payment-proof') ||
            req.header('payment-proof') ||
            req.header('Authorization');
        let proof = undefined;
        if (proofHeader) {
            try {
                const rawHeader = proofHeader.startsWith('Bearer ')
                    ? proofHeader.slice(7)
                    : proofHeader.startsWith('x402 ')
                        ? proofHeader.slice(5)
                        : proofHeader;
                proof = JSON.parse(Buffer.from(rawHeader, 'base64').toString('utf-8'));
            }
            catch (err) {
                try {
                    proof = JSON.parse(proofHeader);
                }
                catch (_) { }
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
        const toolName = req.body?.tool ||
            req.body?.function ||
            req.body?.name ||
            req.query?.tool ||
            'generic_mcp_endpoint';
        const price = {
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
function validateOrChallengeX402(toolName, price, paymentProof, verifier = verifier_1.defaultVerifier) {
    if (paymentProof) {
        const verification = verifier.verifyProof(paymentProof);
        if (verification.valid && verification.receipt) {
            const receipt = verification.receipt;
            // Ensure the payment matches the required amount and currency
            if (receipt.amountPaid.amount >= price.amount && receipt.amountPaid.currency === price.currency) {
                return { success: true, receipt };
            }
        }
    }
    const challenge = verifier.createChallenge(toolName, price);
    return {
        success: false,
        status: 402,
        challenge,
    };
}
