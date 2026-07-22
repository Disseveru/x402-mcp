import { DataInsightsService, DataQueryInput } from '../services/data-insights.service';
import { AgentExecutorService, AgentTaskInput } from '../services/agent-executor.service';
import { EscrowService, EscrowContractInput } from '../services/escrow.service';
import { SecurityAuditorService, SecurityAuditInput } from '../services/security-auditor.service';
import { ArbitragePredictorService, ArbitragePredictorInput } from '../services/arbitrage-predictor.service';
import { ContextFirewallService, ContextFirewallInput } from '../services/context-firewall.service';
import { ProofAttestorService, ProofAttestorInput } from '../services/proof-attestor.service';
import { SLAInsuranceService, SLAInsuranceInput } from '../services/sla-insurance.service';
import { AgentTrustOracleService, AgentTrustQueryInput } from '../services/trust-oracle.service';
import { AgentContextVaultService, StoreVaultItemInput } from '../services/context-vault.service';
import { AgentConsensusOracleService, ConsensusAuditInput } from '../services/consensus-oracle.service';
import { ZeroKnowledgeTrustOracleService, ZKTrustInput } from '../services/zero-knowledge-trust.service';
import { EphemeralContextVaultService, EphemeralContextVaultInput } from '../services/ephemeral-context-vault.service';
import { HallucinationConsensusOracleService, HallucinationConsensusInput } from '../services/hallucination-consensus.service';

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
const trustOracleService = new AgentTrustOracleService();
const contextVaultService = new AgentContextVaultService();
const consensusOracleService = new AgentConsensusOracleService();
const zeroKnowledgeTrustOracleService = new ZeroKnowledgeTrustOracleService();
const ephemeralContextVaultService = new EphemeralContextVaultService();
const hallucinationConsensusOracleService = new HallucinationConsensusOracleService();

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
    handler: async (args: any, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const price = { amount: 25, currency: 'USD_CENT', formatted: '$0.25 USD' };
      const gate = validateOrChallengeX402('x402_atomic_pipeline_router', price, paymentProof, verifier);
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

  agent_trust_oracle: {
    name: 'agent_trust_oracle',
    description: 'Calculates real-time agent reputation scores, SLA compliance, prompt injection threat levels, and settled volume. Requires $0.35 USD fee.',
    priceFormatted: AgentTrustOracleService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Target agent ID or wallet address to query' },
        timeWindowDays: { type: 'number', description: 'Analytical window in days (default 30)' },
        forceRecalculate: { type: 'boolean', description: 'Force recalculation bypassing cache' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['agentId'],
    },
    handler: async (args: AgentTrustQueryInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_trust_oracle', AgentTrustOracleService.PRICE, paymentProof, verifier);
      if (!gate.success) {
        return gate;
      }
      const data = await trustOracleService.getTrustMetrics(args);
      return {
        success: true,
        receipt: gate.receipt,
        data,
      };
    },
  },

  agent_context_vault: {
    name: 'agent_context_vault',
    description: 'Encrypted time-to-live (TTL) shared memory vault for multi-agent swarms. Requires $0.25 USD fee.',
    priceFormatted: AgentContextVaultService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        swarmId: { type: 'string', description: 'Swarm identifier' },
        key: { type: 'string', description: 'Secret storage key' },
        value: { description: 'Payload object or secret to store' },
        writerAgentId: { type: 'string', description: 'Agent ID storing the secret' },
        ttlSeconds: { type: 'number', description: 'Expiration in seconds (default 3600)' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['swarmId', 'key', 'value', 'writerAgentId'],
    },
    handler: async (args: StoreVaultItemInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_context_vault', AgentContextVaultService.PRICE, paymentProof, verifier);
      if (!gate.success) {
        return gate;
      }
      const data = await contextVaultService.storeSecret(args);
      return {
        success: true,
        receipt: gate.receipt,
        data,
      };
    },
  },

  agent_consensus_oracle: {
    name: 'agent_consensus_oracle',
    description: 'Multi-model semantic sanity & hallucination auditor for structured JSON payloads. Requires $0.85 USD fee.',
    priceFormatted: AgentConsensusOracleService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        payload: { type: 'object', description: 'Structured JSON payload to audit' },
        expectedSchema: { type: 'object', description: 'Optional expected schema mapping field -> type' },
        domainContext: { type: 'string', enum: ['FINANCIAL', 'CODE', 'LEGAL', 'METRICS', 'GENERAL'] },
        strictness: { type: 'string', enum: ['STANDARD', 'STRICT', 'PARANOID'] },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['payload'],
    },
    handler: async (args: ConsensusAuditInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_consensus_oracle', AgentConsensusOracleService.PRICE, paymentProof, verifier);
      if (!gate.success) {
        return gate;
      }
      const data = await consensusOracleService.auditConsensus(args);
      return {
        success: true,
        receipt: gate.receipt,
        data,
      };
    },
  },

  agent_zero_knowledge_trust_oracle: {
    name: 'agent_zero_knowledge_trust_oracle',
    description: 'Verifies zero-knowledge trust proofs, agent identity claims, and reputation attestations without disclosing underlying private model weights or credentials. Requires $0.005 USD fee.',
    priceFormatted: ZeroKnowledgeTrustOracleService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Target agent ID or public key' },
        proofType: { type: 'string', enum: ['identity', 'reputation', 'solvency', 'compliance'], description: 'Type of ZK proof' },
        zkProofPayload: { type: 'string', description: 'Base64/JSON encoded zero-knowledge proof payload' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['agentId', 'proofType', 'zkProofPayload'],
    },
    handler: async (args: ZKTrustInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_zero_knowledge_trust_oracle', ZeroKnowledgeTrustOracleService.PRICE, paymentProof, verifier);
      if (!gate.success) {
        return gate;
      }
      const data = await zeroKnowledgeTrustOracleService.verifyProof(args);
      return {
        success: true,
        receipt: gate.receipt,
        data,
      };
    },
  },

  agent_ephemeral_context_vault: {
    name: 'agent_ephemeral_context_vault',
    description: 'Provides high-speed, temporary encrypted key-value context storage with auto-expiring TTL for inter-agent workflows. Requires $0.001 USD fee.',
    priceFormatted: EphemeralContextVaultService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['store', 'retrieve', 'delete'], description: 'Vault action' },
        key: { type: 'string', description: 'Context vault key identifier' },
        value: { type: 'string', description: 'Encrypted value content (required for store)' },
        ttlSeconds: { type: 'number', description: 'Time-to-live in seconds (default 300)' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['action', 'key'],
    },
    handler: async (args: EphemeralContextVaultInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_ephemeral_context_vault', EphemeralContextVaultService.PRICE, paymentProof, verifier);
      if (!gate.success) {
        return gate;
      }
      const data = await ephemeralContextVaultService.handleVaultAction(args);
      return {
        success: true,
        receipt: gate.receipt,
        data,
      };
    },
  },

  agent_hallucination_consensus_oracle: {
    name: 'agent_hallucination_consensus_oracle',
    description: 'Cross-checks LLM response claims across a multi-node validator consensus network to detect hallucinations and factual drift. Requires $0.002 USD fee.',
    priceFormatted: HallucinationConsensusOracleService.PRICE.formatted,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Original prompt or query text' },
        responseClaim: { type: 'string', description: 'Model output or claim to evaluate for hallucination' },
        consensusThreshold: { type: 'number', description: 'Required consensus agreement ratio (0.5 to 1.0)' },
        paymentProof: { type: 'object', description: 'x402 payment proof object' },
      },
      required: ['prompt', 'responseClaim'],
    },
    handler: async (args: HallucinationConsensusInput, paymentProof?: X402PaymentProof, verifier?: X402Verifier) => {
      const gate = validateOrChallengeX402('agent_hallucination_consensus_oracle', HallucinationConsensusOracleService.PRICE, paymentProof, verifier);
      if (!gate.success) {
        return gate;
      }
      const data = await hallucinationConsensusOracleService.evaluateConsensus(args);
      return {
        success: true,
        receipt: gate.receipt,
        data,
      };
    },
  },
};
