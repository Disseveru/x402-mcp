"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireX402Payment = requireX402Payment;
exports.validateOrChallengeX402 = validateOrChallengeX402;
const verifier_1 = require("./verifier");
/**
 * Express Middleware enforcing HTTP 402 Payment Required for API endpoints
 */
function requireX402Payment(toolName, price, verifier = verifier_1.defaultVerifier) {
    return (req, res, next) => {
        const proofHeader = req.header('X-402-Payment-Proof') || req.header('x-402-payment-proof');
        if (proofHeader) {
            try {
                const proof = JSON.parse(Buffer.from(proofHeader, 'base64').toString('utf-8'));
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
function validateOrChallengeX402(toolName, price, paymentProof, verifier = verifier_1.defaultVerifier) {
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
