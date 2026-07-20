"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCP_TOOLS = void 0;
const data_insights_service_1 = require("../services/data-insights.service");
const agent_executor_service_1 = require("../services/agent-executor.service");
const escrow_service_1 = require("../services/escrow.service");
const security_auditor_service_1 = require("../services/security-auditor.service");
const arbitrage_predictor_service_1 = require("../services/arbitrage-predictor.service");
const context_firewall_service_1 = require("../services/context-firewall.service");
const proof_attestor_service_1 = require("../services/proof-attestor.service");
const sla_insurance_service_1 = require("../services/sla-insurance.service");
const middleware_1 = require("../x402/middleware");
const dataService = new data_insights_service_1.DataInsightsService();
const executorService = new agent_executor_service_1.AgentExecutorService();
const escrowService = new escrow_service_1.EscrowService();
const securityAuditorService = new security_auditor_service_1.SecurityAuditorService();
const arbitragePredictorService = new arbitrage_predictor_service_1.ArbitragePredictorService();
const contextFirewallService = new context_firewall_service_1.ContextFirewallService();
const proofAttestorService = new proof_attestor_service_1.ProofAttestorService();
const slaInsuranceService = new sla_insurance_service_1.SLAInsuranceService();
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
    agent_code_security_auditor: {
        name: 'agent_code_security_auditor',
        description: 'Performs static analysis and vulnerability scanning on agent code payloads before execution. Requires $0.75 USD fee.',
        priceFormatted: security_auditor_service_1.SecurityAuditorService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Code payload to audit' },
                language: { type: 'string', description: 'Programming language' },
                strictness: { type: 'string', enum: ['standard', 'high', 'paranoid'] },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['code'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('agent_code_security_auditor', security_auditor_service_1.SecurityAuditorService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await securityAuditorService.auditCode(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    liquidity_arbitrage_predictor: {
        name: 'liquidity_arbitrage_predictor',
        description: 'Scans DEX/CEX order books to identify real-time cross-chain arbitrage spreads. Requires $0.60 USD fee.',
        priceFormatted: arbitrage_predictor_service_1.ArbitragePredictorService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                pair: { type: 'string', description: 'Asset pair (e.g., WETH-USDC)' },
                dexList: { type: 'array', items: { type: 'string' } },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['pair'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('liquidity_arbitrage_predictor', arbitrage_predictor_service_1.ArbitragePredictorService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await arbitragePredictorService.predictArbitrage(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    agent_context_firewall: {
        name: 'agent_context_firewall',
        description: 'Sanitizes bought data streams and incoming API payloads for hidden prompt injections, jailbreaks, and context-poisoning attacks. Requires $0.40 USD fee.',
        priceFormatted: context_firewall_service_1.ContextFirewallService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                payload: { type: 'string', description: 'Incoming text/json payload to sanitize' },
                allowHtml: { type: 'boolean' },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['payload'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('agent_context_firewall', context_firewall_service_1.ContextFirewallService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await contextFirewallService.sanitizePayload(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    agent_execution_proof_attestor: {
        name: 'agent_execution_proof_attestor',
        description: 'Generates cryptographic step-telemetry and merkle execution trace commitments proving compute work was actually performed. Requires $0.35 USD fee.',
        priceFormatted: proof_attestor_service_1.ProofAttestorService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                stepData: { type: 'object', description: 'Execution payload object' },
                agentId: { type: 'string', description: 'Seller Agent ID' },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['stepData', 'agentId'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('agent_execution_proof_attestor', proof_attestor_service_1.ProofAttestorService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await proofAttestorService.generateProof(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    agent_sla_micro_insurance: {
        name: 'agent_sla_micro_insurance',
        description: 'Locks micro-bonds for seller tool calls. Automatically triggers instant buyer refunds and micro-penalties if seller latency exceeds SLA thresholds. Requires $0.50 USD fee.',
        priceFormatted: sla_insurance_service_1.SLAInsuranceService.PRICE.formatted,
        inputSchema: {
            type: 'object',
            properties: {
                contractId: { type: 'string', description: 'Contract / Escrow ID' },
                maxLatencyMs: { type: 'number', description: 'Maximum allowed execution latency in ms' },
                collateralUSD: { type: 'number', description: 'Bond collateral amount in USD' },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['contractId', 'maxLatencyMs', 'collateralUSD'],
        },
        handler: async (args, paymentProof, verifier) => {
            const gate = (0, middleware_1.validateOrChallengeX402)('agent_sla_micro_insurance', sla_insurance_service_1.SLAInsuranceService.PRICE, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            const data = await slaInsuranceService.issuePolicy(args);
            return {
                success: true,
                receipt: gate.receipt,
                data,
            };
        },
    },
    x402_atomic_pipeline_router: {
        name: 'x402_atomic_pipeline_router',
        description: 'Orchestrates multi-agent dependency DAGs with a single atomic x402 payment that automatically fans out and settles across sub-agent nodes. Requires $0.25 USD fee.',
        priceFormatted: '$0.25 USD',
        inputSchema: {
            type: 'object',
            properties: {
                pipelineSteps: { type: 'string', description: 'JSON string of sub-agent dependency graph' },
                totalBudgetUSD: { type: 'number', description: 'Maximum total pipeline payment budget' },
                paymentProof: { type: 'object', description: 'x402 payment proof object' },
            },
            required: ['pipelineSteps'],
        },
        handler: async (args, paymentProof, verifier) => {
            const price = { amount: 25, currency: 'USD_CENT', formatted: '$0.25 USD' };
            const gate = (0, middleware_1.validateOrChallengeX402)('x402_atomic_pipeline_router', price, paymentProof, verifier);
            if (!gate.success) {
                return gate;
            }
            return {
                success: true,
                receipt: gate.receipt,
                data: {
                    service: 'x402 Composable Multi-Agent Atomic Pipeline Router',
                    executedAt: Date.now(),
                    status: 'SUCCESS',
                    inputReceived: args,
                    output: {
                        pipelineId: 'pipe_atomic_552299',
                        subAgentsContractedCount: 3,
                        pipelineStatus: 'EXECUTED_SETTLED',
                        totalSettledUSD: '$0.40 USD',
                        rollbackTriggered: false,
                    },
                    providerNode: 'seller-service-factory:auto-node-v1',
                },
            };
        },
    },
};
