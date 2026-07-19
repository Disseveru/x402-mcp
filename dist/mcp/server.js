"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCommerceMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const express_1 = __importDefault(require("express"));
const tools_1 = require("./tools");
const discovery_1 = require("../bazaar/discovery");
class AgentCommerceMCPServer {
    server;
    app;
    constructor() {
        this.server = new index_js_1.Server({
            name: process.env.MCP_SERVER_NAME || 'gemini-agent-commerce-suite',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json());
        this.setupHandlers();
        this.setupHttpEndpoints();
    }
    setupHandlers() {
        // List Tools Handler
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            const tools = Object.values(tools_1.MCP_TOOLS).map(t => ({
                name: t.name,
                description: `${t.description} [Price: ${t.priceFormatted}]`,
                inputSchema: t.inputSchema,
            }));
            return { tools };
        });
        // Call Tool Handler
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const toolDef = tools_1.MCP_TOOLS[name];
            if (!toolDef) {
                throw new Error(`Tool '${name}' not found in Gemini Agent Commerce Suite`);
            }
            const paymentProof = args?.paymentProof;
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
    setupHttpEndpoints() {
        // Attach Bazaar Discovery Endpoints
        this.app.use('/', (0, discovery_1.createBazaarRouter)());
        // Primary Gemini & MCP Tool Execution Endpoint
        const handleToolCall = async (req, res) => {
            try {
                const { tool, arguments: toolArgs, paymentProof } = req.body;
                const toolName = tool || req.body.function || req.body.name;
                const toolDef = tools_1.MCP_TOOLS[toolName];
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
            }
            catch (err) {
                res.status(500).json({ error: err.message || 'Internal Gemini MCP server error' });
            }
        };
        this.app.post('/gemini/v1/call', handleToolCall);
        this.app.post('/mcp/v1/call', handleToolCall);
        // Gemini Tool Declarations API
        const handleListTools = (_req, res) => {
            const tools = Object.values(tools_1.MCP_TOOLS).map(t => ({
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
    async startStdio() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('[Gemini MCP Server] Connected to stdio transport.');
    }
    listenHttp(port = 4020) {
        const actualPort = process.env.PORT ? parseInt(process.env.PORT, 10) : port;
        return this.app.listen(actualPort, () => {
            console.log(`[Gemini MCP Server] HTTP Server running on port ${actualPort}`);
            console.log(`[Gemini MCP Server] Bazaar Discovery: http://localhost:${actualPort}/.well-known/bazaar.json`);
            console.log(`[Gemini MCP Server] Gemini Tool Endpoint: http://localhost:${actualPort}/gemini/v1/call`);
        });
    }
}
exports.AgentCommerceMCPServer = AgentCommerceMCPServer;
if (require.main === module) {
    const mcpServer = new AgentCommerceMCPServer();
    if (process.argv.includes('--stdio')) {
        mcpServer.startStdio();
    }
    else {
        mcpServer.listenHttp();
    }
}
