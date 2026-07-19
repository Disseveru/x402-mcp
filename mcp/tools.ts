import { DataInsightsService, DataQueryInput } from '../services/data-insights.service';
import { AgentExecutorService, AgentTaskInput } from '../services/agent-executor.service';
import { EscrowService, EscrowContractInput } from '../services/escrow.service';
import { SecurityAuditorService, SecurityAuditInput } from '../services/security-auditor.service';
import { ArbitragePredictorService, ArbitragePredictorInput } from '../services/arbitrage-predictor.service';
import { ContextFirewallService, ContextFirewallInput } from '../services/context-firewall.service';
import { ProofAttestorService, ProofAttestorInput } from '../services/proof-attestor.service';
import { SLAInsuranceService, SLAInsuranceInput } from '../services/sla-insurance.service';

import { validateOrChallengeX402 } from '../x402/middleware';
import { X402PaymentProof } from '../x402/types';
import { X402Verifier } from '../x402/verifier';

const dataService = new DataInsightsService();
const executorService = new AgentExecutorService();
const escrowService = new EscrowService();
const securityAuditorService = new SecurityAuditorService();
const arbitragePredictorService = new ArbitragePredictorService();
const contextFirewallService = new ContextFirewallService();
const proofAttestorService = new ProofAttestorService();
const slaInsuranceService = new SLAInsuranceService();

export interface MCPToolDefinition {
  name: string;
  description: string;
  priceFormatted: string;
  inputSchema: any;
  handler: (args: any, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => Promise<any>;
}

export const MCP_TOOLS: Record<string, MCPToolDefinition> = {
  market_data_insights: {
    name: 'market_data_insights',
    description: 'Fetch premium quantitative market analytics & metrics. Requires $0.50 USD payment via x402 protocol.',
    priceFormatted: DataInsightsService.PRICE.formatted,
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
    handler: async (args: DataQueryInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('market_data_insights', DataInsightsService.PRICE, paymentProof, verifier);
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
    priceFormatted: AgentExecutorService.PRICE.formatted,
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
    handler: async (args: AgentTaskInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_task_executor', AgentExecutorService.PRICE, paymentProof, verifier);
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
    priceFormatted: EscrowService.FEE_PRICE.formatted,
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
    handler: async (args: EscrowContractInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_escrow_service', EscrowService.FEE_PRICE, paymentProof, verifier);
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
    priceFormatted: SecurityAuditorService.PRICE.formatted,
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
    handler: async (args: SecurityAuditInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_code_security_auditor', SecurityAuditorService.PRICE, paymentProof, verifier);
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
    priceFormatted: ArbitragePredictorService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        pair: { type: 'string', description: 'Asset pair (e.g., WETH-USDC)' },
        dexList: { type: 'array', items: { type: 'string' } },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['pair'],
    },
    handler: async (args: ArbitragePredictorInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('liquidity_arbitrage_predictor', ArbitragePredictorService.PRICE, paymentProof, verifier);
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
    priceFormatted: ContextFirewallService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        payload: { type: 'string', description: 'Incoming text/json payload to sanitize' },
        allowHtml: { type: 'boolean' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['payload'],
    },
    handler: async (args: ContextFirewallInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_context_firewall', ContextFirewallService.PRICE, paymentProof, verifier);
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
    priceFormatted: ProofAttestorService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        stepData: { type: 'object', description: 'Execution payload object' },
        agentId: { type: 'string', description: 'Seller Agent ID' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['stepData', 'agentId'],
    },
    handler: async (args: ProofAttestorInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_execution_proof_attestor', ProofAttestorService.PRICE, paymentProof, verifier);
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
    priceFormatted: SLAInsuranceService.PRICE.formatted,
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
    handler: async (args: SLAInsuranceInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_sla_micro_insurance', SLAInsuranceService.PRICE, paymentProof, verifier);
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
};
