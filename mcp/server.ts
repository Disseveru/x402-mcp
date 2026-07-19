import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { MCP_TOOLS } from './tools';
import { createBazaarRouter } from '../bazaar/discovery';
import { X402PaymentProof } from '../x402/types';

export class AgentCommerceMCPServer {
  private server: Server;
  private app: express.Application;

  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'gemini-agent-commerce-suite',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.app = express();
    this.app.use(express.json());
    this.setupHandlers();
    this.setupHttpEndpoints();
  }

  private setupHandlers() {
    // List Tools Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Object.values(MCP_TOOLS).map(t => ({
        name: t.name,
        description: `${t.description} [Price: ${t.priceFormatted}]`,
        inputSchema: t.inputSchema,
      }));
      return { tools };
    });

    // Call Tool Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolDef = MCP_TOOLS[name];

      if (!toolDef) {
        throw new Error(`Tool '${name}' not found in Gemini Agent Commerce Suite`);
      }

      const paymentProof = args?.paymentProof as X402PaymentProof | undefined;
      const result = await toolDef.handler(args, paymentProof);

      if (result.status === 402) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 402,
                error: 'PAYMENT_REQUIRED',
                message: `Tool '${name}' requires x402 payment of ${toolDef.priceFormatted}. Please submit payment proof.`,
                challenge: result.challenge,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });
  }

  private setupHttpEndpoints() {
    // Attach Bazaar Discovery Endpoints
    this.app.use('/', createBazaarRouter());

    // Primary Gemini & MCP Tool Execution Endpoint
    const handleToolCall = async (req: express.Request, res: express.Response) => {
      try {
        const { tool, arguments: toolArgs, paymentProof } = req.body;
        const toolName = tool || req.body.function || req.body.name;
        const toolDef = MCP_TOOLS[toolName];

        if (!toolDef) {
          res.status(404).json({ error: `Tool ${toolName} not found in Gemini Suite` });
          return;
        }

        const proof = paymentProof || toolArgs?.paymentProof;
        const result = await toolDef.handler(toolArgs || req.body.parameters || {}, proof);

        if (result.status === 402) {
          res.status(402).json(result);
          return;
        }

        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal Gemini MCP server error' });
      }
    };

    this.app.post('/gemini/v1/call', handleToolCall);
    this.app.post('/mcp/v1/call', handleToolCall);

    // Gemini Tool Declarations API
    const handleListTools = (_req: express.Request, res: express.Response) => {
      const tools = Object.values(MCP_TOOLS).map(t => ({
        name: t.name,
        description: t.description,
        price: t.priceFormatted,
        parameters: t.inputSchema,
      }));
      res.json({ defaultAgent: 'Gemini 3.5 / Antigravity', tools });
    };

    this.app.get('/gemini/v1/tools', handleListTools);
    this.app.get('/mcp/v1/tools', handleListTools);
  }

  public async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Gemini MCP Server] Connected to stdio transport.');
  }

  public listenHttp(port: number = 4020) {
    const actualPort = process.env.PORT ? parseInt(process.env.PORT, 10) : port;
    return this.app.listen(actualPort, () => {
      console.log(`[Gemini MCP Server] HTTP Server running on port ${actualPort}`);
      console.log(`[Gemini MCP Server] Bazaar Discovery: http://localhost:${actualPort}/.well-known/bazaar.json`);
      console.log(`[Gemini MCP Server] Gemini Tool Endpoint: http://localhost:${actualPort}/gemini/v1/call`);
    });
  }
}

if (require.main === module) {
  const mcpServer = new AgentCommerceMCPServer();
  if (process.argv.includes('--stdio')) {
    mcpServer.startStdio();
  } else {
    mcpServer.listenHttp();
  }
}
