"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCP_TOOLS = void 0;
const data_insights_service_1 = require("../services/data-insights.service");
const agent_executor_service_1 = require("../services/agent-executor.service");
const escrow_service_1 = require("../services/escrow.service");
const middleware_1 = require("../x402/middleware");
const dataService = new data_insights_service_1.DataInsightsService();
const executorService = new agent_executor_service_1.AgentExecutorService();
const escrowService = new escrow_service_1.EscrowService();
exports.MCP_TOOLS = {
    market_data_insights: {
        name: 'market_data_insights',
        description: 'Fetch premium quantitative market analytics & metrics. Requires $0.50 USD payment via x402 protocol.',
        priceFormatted: data_insights_service_1.DataInsightsService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                ticker: { type: 'string', description: 'Asset symbol e.g. BTC, ETH, SOL' },
                timeframe: { type: 'string', enum: ['1h', '24h', '7d', '30d'], description: 'Analytical timeframe' },
                metrics: {
                    type: 'array',
                    items: { type: 'string', enum: ['volatility', 'sentiment', 'order_book_depth', 'whale_flow'] },
                    description: 'Metrics requested',
                },
                paymentProof: {
                    type: 'object',
                    description: 'Optional x402 payment proof object if fulfilling an invoice challenge',
                },
            },
            required: ['ticker', 'timeframe', 'metrics'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('market_data_insights', data_insights_service_1.DataInsightsService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await dataService.fetchInsights(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    agent_task_executor: {
        name: 'agent_task_executor',
        description: 'Executes a remote sub-agent compute payload in an isolated sandbox. Requires $1.00 USD payment via x402 protocol.',
        priceFormatted: agent_executor_service_1.AgentExecutorService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                taskName: { type: 'string', description: 'Descriptive task title' },
                codeOrInstructions: { type: 'string', description: 'Instructions or payload to execute' },
                maxTimeoutMs: { type: 'number', description: 'Max runtime timeout in milliseconds' },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['taskName', 'codeOrInstructions'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('agent_task_executor', agent_executor_service_1.AgentExecutorService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await executorService.executeTask(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    agent_escrow_service: {
        name: 'agent_escrow_service',
        description: 'Creates a multi-sig conditional trade escrow contract for agent-to-agent transactions. Requires $0.25 USD fee.',
        priceFormatted: escrow_service_1.EscrowService.FEE_PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                buyerAgent: { type: 'string', description: 'Address/ID of buyer agent' },
                sellerAgent: { type: 'string', description: 'Address/ID of seller agent' },
                amountUSD: { type: 'number', description: 'Escrow amount in USD' },
                conditions: { type: 'string', description: 'Condition terms for funds release' },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['buyerAgent', 'sellerAgent', 'amountUSD', 'conditions'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('agent_escrow_service', escrow_service_1.EscrowService.FEE_PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await escrowService.createEscrow(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
};
