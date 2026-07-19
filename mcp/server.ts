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
import { db } from '../services/database.service';
import { cache } from '../services/cache.service';

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
      
      // Try to get from cache first
      let result;
      if (!paymentProof) {
        result = await cache.getToolResultFromCache(name, args);
        if (result) {
          console.log(`[Cache Hit] Tool '${name}' result served from cache`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
      }
      
      result = await toolDef.handler(args, paymentProof);

      // Cache successful results
      if (result.success && !paymentProof) {
        await cache.cacheToolResult(name, args, result, 3600);
      }

      // Log tool execution to database
      try {
        const agentId = (args && typeof args === 'object' && 'agentId' in args) ? String(args.agentId) : null;
        await db.logToolExecution(
          name,
          agentId,
          paymentProof ? 'PAID' : 'UNPAID',
          Buffer.from(JSON.stringify(result)).toString('hex').slice(0, 64),
          { args: typeof args === 'string' ? args : Object.keys(args || {}) }
        );
      } catch (err) {
        console.warn(`[Database] Failed to log tool execution: ${err}`);
      }

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

        // Try cache first
        let result;
        if (!paymentProof) {
          result = await cache.getToolResultFromCache(toolName, toolArgs);
          if (result) {
            console.log(`[Cache Hit] Tool '${toolName}' result served from cache`);
            res.json({ ...result, cached: true });
            return;
          }
        }

        const proof = paymentProof || toolArgs?.paymentProof;
        result = await toolDef.handler(toolArgs || req.body.parameters || {}, proof);

        // Cache successful results
        if (result.success && !proof) {
          await cache.cacheToolResult(toolName, toolArgs, result, 3600);
        }

        // Log to database
        try {
          const ipAddr = req.ip || null;
          await db.logToolExecution(
            toolName,
            ipAddr,
            proof ? 'PAID' : 'UNPAID',
            Buffer.from(JSON.stringify(result)).toString('hex').slice(0, 64),
            { method: 'HTTP', ipAddress: ipAddr }
          );
          
          await cache.incrementCounter(`tool:calls:${toolName}`, 1);
        } catch (err) {
          console.warn(`[Database] Failed to log tool execution: ${err}`);
        }

        if (result.status === 402) {
          const challengePayload = result.challenge || result;
          const encodedChallenge = Buffer.from(JSON.stringify(challengePayload)).toString('base64');
          res.setHeader('PAYMENT-REQUIRED', encodedChallenge);
          res.setHeader('Payment-Required', encodedChallenge);
          res.setHeader('X-402-Payment-Required', encodedChallenge);
          res.setHeader('WWW-Authenticate', `x402 challenge="${(challengePayload as any).challengeHash || (challengePayload as any).invoiceId || ''}"`);
          res.status(402).json(result);
          return;
        }

        res.json(result);
      } catch (err: any) {
        console.error('[Server] Tool call error:', err);
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

    // Health check endpoint
    this.app.get('/health', async (req: express.Request, res: express.Response) => {
      try {
        const cacheStatus = cache ? 'connected' : 'disconnected';
        const dbStatus = db ? 'connected' : 'disconnected';
        res.json({
          status: 'healthy',
          server: 'Gemini Agent Commerce MCP Suite',
          cache: cacheStatus,
          database: dbStatus,
          uptime: process.uptime(),
        });
      } catch (err) {
        res.status(500).json({ status: 'unhealthy', error: String(err) });
      }
    });

    // Stats endpoint
    this.app.get('/stats', async (req: express.Request, res: express.Response) => {
      try {
        const stats: any = {
          tools: Object.keys(MCP_TOOLS).length,
          toolCalls: {},
        };

        for (const toolName of Object.keys(MCP_TOOLS)) {
          const count = await cache.getCounter(`tool:calls:${toolName}`);
          stats.toolCalls[toolName] = count;
        }

        res.json(stats);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
  }

  public async initialize(): Promise<void> {
    console.log('[Server] Initializing services...');
    try {
      await cache.connect();
      console.log('[Server] Cache service initialized');
    } catch (err) {
      console.warn('[Server] Cache service failed to initialize:', err);
    }

    try {
      await db.connect();
      await db.createToolAuditTable();
      await db.createToolUsageTable();
      console.log('[Server] Database service initialized');
    } catch (err) {
      console.warn('[Server] Database service failed to initialize:', err);
    }
  }

  public async startStdio() {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Gemini MCP Server] Connected to stdio transport.');
  }

  public async listenHttp(port: number = 4020) {
    await this.initialize();
    const actualPort = process.env.PORT ? parseInt(process.env.PORT, 10) : port;
    return this.app.listen(actualPort, () => {
      console.log(`[Gemini MCP Server] HTTP Server running on port ${actualPort}`);
      console.log(`[Gemini MCP Server] Bazaar Discovery: http://localhost:${actualPort}/.well-known/bazaar.json`);
      console.log(`[Gemini MCP Server] Gemini Tool Endpoint: http://localhost:${actualPort}/gemini/v1/call`);
      console.log(`[Gemini MCP Server] Health Check: http://localhost:${actualPort}/health`);
      console.log(`[Gemini MCP Server] Stats: http://localhost:${actualPort}/stats`);
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

