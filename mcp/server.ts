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
import { x402ExpressMiddleware } from '../x402/middleware';

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
    this.setupMiddleware();
    this.setupHandlers();
    this.setupHttpEndpoints();
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));

    // Production Resilience, Security & CORS Headers Middleware
    this.app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-402-Payment-Proof, PAYMENT-REQUIRED, Payment-Required, X-402-Payment-Required'
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'PAYMENT-REQUIRED, Payment-Required, X-402-Payment-Required, WWW-Authenticate, X-402-Receipt'
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      if (_req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
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
    // Railway Container Health Probes & Monitoring Handler
    const healthHandler = (_req: express.Request, res: express.Response) => {
      res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        targetNetwork: 'base-mainnet',
        serverName: process.env.MCP_SERVER_NAME || 'gemini-agent-commerce-suite',
        merchantPaymentAddress: process.env.MERCHANT_PAYMENT_ADDRESS || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        activeToolsCount: Object.keys(MCP_TOOLS).length,
        services: {
          bazaarDiscovery: 'healthy',
          x402Protocol: 'healthy',
          mcpServer: 'healthy',
        },
      });
    };

    this.app.get('/health', healthHandler);
    this.app.get('/healthz', healthHandler);
    this.app.get('/status', healthHandler);

    this.app.get('/', (req: express.Request, res: express.Response) => {
      if (req.headers.accept?.includes('application/json') || req.query.json === 'true') {
        healthHandler(req, res);
      } else {
        res.status(200).json({
          status: 'ok',
          service: 'x402 Autonomous Seller MCP Platform & Service Factory',
          network: 'base-mainnet',
          endpoints: {
            health: '/health',
            bazaar: '/.well-known/bazaar.json',
            tools: '/gemini/v1/tools',
            execute: '/gemini/v1/call',
          },
          toolsCount: Object.keys(MCP_TOOLS).length,
          activeTools: Object.keys(MCP_TOOLS),
        });
      }
    });

    // Attach Bazaar Discovery Endpoints
    this.app.use('/', createBazaarRouter());

    // x402 Middleware MUST run BEFORE any auth middleware or tool handler
    // Returns HTTP 402 for unauthenticated requests
    const x402Middleware = x402ExpressMiddleware();

    // Primary Gemini & MCP Tool Execution Endpoint
    const handleToolCall = async (req: express.Request, res: express.Response) => {
      try {
        const { tool, arguments: toolArgs, paymentProof } = req.body;
        const toolName = tool || req.body?.function || req.body?.name;
        const toolDef = MCP_TOOLS[toolName];

        if (!toolDef) {
          res.status(404).json({ error: `Tool ${toolName} not found in Gemini Suite` });
          return;
        }

        const proof = paymentProof || toolArgs?.paymentProof;
        const result = await toolDef.handler(toolArgs || req.body?.parameters || {}, proof);

        if (result.status === 402) {
          const challengePayload = result.challenge || result;
          const encodedChallenge = Buffer.from(JSON.stringify(challengePayload)).toString('base64');
          res.setHeader('PAYMENT-REQUIRED', encodedChallenge);
          res.setHeader('Payment-Required', encodedChallenge);
          res.setHeader('X-402-Payment-Required', encodedChallenge);
          res.setHeader('WWW-Authenticate', `x402 challenge="${challengePayload.challengeHash || challengePayload.invoiceId || ''}"`);
          res.status(402).json(result);
          return;
        }

        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Internal Gemini MCP server error' });
      }
    };

    // Mount x402 middleware BEFORE tool handlers for unauthenticated 402 discoverability
    this.app.all('/gemini/v1/call', x402Middleware, handleToolCall);
    this.app.all('/mcp/v1/call', x402Middleware, handleToolCall);
    this.app.all('/mcp', x402Middleware, handleToolCall);
    this.app.all('/call', x402Middleware, handleToolCall);

    // Gemini Tool Declarations API
    const handleListTools = (_req: express.Request, res: express.Response) => {
      const tools = Object.values(MCP_TOOLS).map(t => ({
        name: t.name,
        description: t.description,
        price: t.priceFormatted,
        parameters: t.inputSchema,
      }));
      res.json({ defaultAgent: 'Gemini 3.5 / Antigravity', toolsCount: tools.length, tools });
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
      console.log(`[Gemini MCP Server] Health Probe Endpoint: http://localhost:${actualPort}/health`);
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
