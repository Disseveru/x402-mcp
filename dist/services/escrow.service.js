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
exports.EscrowService = void 0;
const crypto = __importStar(require("crypto"));
class EscrowService {
    static FEE_PRICE = {
        amount: 25,
        currency: 'USD_CENT',
        formatted: '$0.25 USD',
    };
    escrows = new Map();
    async createEscrow(input) {
        const escrowId = `esc_${crypto.randomBytes(6).toString('hex')}`;
        const createdAt = Date.now();
        const expiresAt = createdAt + (input.expiryMinutes || 60) * 60 * 1000;
        const escrow = {
            escrowId,
            buyerAgent: input.buyerAgent,
            sellerAgent: input.sellerAgent,
            amountUSD: input.amountUSD,
            status: 'FUNDS_LOCKED', // Auto-lock upon x402 payment
            conditions: input.conditions,
            createdAt,
            expiresAt,
            fundingTxHash: `0x${crypto.randomBytes(32).toString('hex')}`,
        };
        this.escrows.set(escrowId, escrow);
        return escrow;
    }
    async releaseEscrow(escrowId, proofOfDelivery) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) {
            throw new Error(`Escrow with ID ${escrowId} not found`);
        }
        if (escrow.status !== 'FUNDS_LOCKED') {
            throw new Error(`Escrow cannot be released from status: ${escrow.status}`);
        }
        escrow.status = 'SETTLED';
        escrow.settlementProof = proofOfDelivery;
        this.escrows.set(escrowId, escrow);
        return escrow;
    }
    getEscrow(escrowId) {
        return this.escrows.get(escrowId);
    }
}
exports.EscrowService = EscrowService;
