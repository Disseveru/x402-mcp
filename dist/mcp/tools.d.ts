import { X402PaymentProof } from '../x402/types';
import { X402Verifier } from '../x402/verifier';
export interface MCPToolDefinition {
    name: string;
    description: string;
    priceFormatted: string;
    inputSchema: any;
    handler: (args: any, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => Promise<any>;
}
export declare const MCP_TOOLS: Record<string, MCPToolDefinition>;
