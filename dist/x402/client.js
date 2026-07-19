"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousBuyerAgentClient = void 0;
const verifier_1 = require("./verifier");
const crypto = __importStar(require("crypto"));
class AutonomousBuyerAgentClient {
    payerAddress;
    verifier;
    constructor(payerAddress, verifier) {
        this.payerAddress = payerAddress || '0xGeminiBuyerAgent_0x998877665544332211';
        this.verifier = verifier || new verifier_1.X402Verifier();
    }
    /**
     * Automatically handle HTTP 402 challenge negotiation and execute monetized calls
     */
    async executeMonetizedCall(toolCallFn) {
        // 1. Initial invocation attempt without payment proof
        const initialResult = await toolCallFn();
        // If initial call succeeded without payment, return directly
        if (initialResult && initialResult.success !== false && initialResult.status !== 402) {
            return { success: true, data: initialResult };
        }
        // 2. Extract Challenge if HTTP 402 received
        let challenge;
        if (initialResult?.status === 402 && initialResult?.challenge) {
            challenge = initialResult.challenge;
        }
        else if (initialResult?.error && typeof initialResult.error === 'object') {
            challenge = initialResult.error.challenge;
        }
        if (!challenge) {
            throw new Error(`Execution failed and no 402 Payment Challenge returned: ${JSON.stringify(initialResult)}`);
        }
        console.log(`[BuyerAgent] Received 402 Payment Required for tool '${challenge.toolName}'. Required: ${challenge.price.formatted}`);
        // 3. Resolve Payment & Generate Cryptographic Proof
        const paymentHash = `tx_hash_${crypto.randomBytes(8).toString('hex')}`;
        const timestamp = Date.now();
        const signature = this.verifier.createAgentProof(challenge.invoiceId, this.payerAddress, paymentHash, challenge.nonce);
        const paymentProof = {
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
    createProofHeader(proof) {
        const base64Proof = Buffer.from(JSON.stringify(proof)).toString('base64');
        return {
            'X-402-Payment-Proof': base64Proof,
        };
    }
}
exports.AutonomousBuyerAgentClient = AutonomousBuyerAgentClient;
