import * as fs from 'fs';
import * as path from 'path';
import { MCP_TOOLS, MCPToolDefinition } from './tools';
import { validateOrChallengeX402 } from '../x402/middleware';

export class DynamicToolRegistry {
  private static initialized = false;
  private static allTools: Record<string, MCPToolDefinition> = {};

  private static init() {
    if (!this.initialized) {
      this.allTools = { ...MCP_TOOLS };
      
      // Auto-register capabilities from Bazaar manifest if missing
      try {
        const manifestPath = path.join(__dirname, '../bazaar/manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          for (const cap of manifest.capabilities || []) {
            if (!this.allTools[cap.name]) {
              const price = cap.price || { amount: 25, currency: 'USD_CENT', formatted: '$0.25 USD' };
              this.allTools[cap.name] = {
                name: cap.name,
                description: `${cap.description} [Requires ${price.formatted} payment via x402]`,
                priceFormatted: price.formatted,
                inputSchema: {
                  type: 'object',
                  properties: {
                    payload: { type: 'string', description: 'Input payload object' },
                    paymentProof: { type: 'object', description: 'x402 payment proof object' },
                  },
                },
                handler: async (args: any, paymentProof?: any, verifier?: any) => {
                  const gate = validateOrChallengeX402(cap.name, price, paymentProof, verifier);
                  if (!gate.success) {
                    return gate;
                  }
                  return {
                    success: true,
                    receipt: gate.receipt,
                    data: {
                      service: cap.name,
                      executedAt: Date.now(),
                      status: 'SUCCESS',
                      inputReceived: args,
                      providerNode: 'seller-service-factory:auto-node-v1',
                    },
                  };
                },
              };
            }
          }
        }
      } catch (e) {
        // Fallback
      }

      this.initialized = true;
    }
  }

  public static registerTool(tool: MCPToolDefinition) {
    this.init();
    this.allTools[tool.name] = tool;
    console.log(`[DynamicToolRegistry] Registered new monetized tool: '${tool.name}' (${tool.priceFormatted})`);
  }

  public static getTool(name: string): MCPToolDefinition | undefined {
    this.init();
    return this.allTools[name];
  }

  public static getAllTools(): MCPToolDefinition[] {
    this.init();
    return Object.values(this.allTools);
  }
}
