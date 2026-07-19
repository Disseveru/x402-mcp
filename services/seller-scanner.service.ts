export interface ServiceBlueprint {
  id: string;
  toolName: string;
  displayName: string;
  category: string;
  description: string;
  priceAmountCents: number;
  priceFormatted: string;
  estimatedRoiScore: number;
  inputParameters: Record<string, { type: string; description: string; enum?: string[] }>;
  sampleOutput: Record<string, any>;
}

export class SellerScannerService {
  private candidateBlueprints: ServiceBlueprint[] = [
    {
      id: 'tool:agent_context_firewall',
      toolName: 'agent_context_firewall',
      displayName: 'Agent Context & Prompt-Injection Firewall',
      category: 'security-infrastructure',
      description: 'Sanitizes bought data streams and incoming API payloads for hidden prompt injections, jailbreaks, and context-poisoning attacks before agent ingestion.',
      priceAmountCents: 10,
      priceFormatted: '$0.10 USD',
      estimatedRoiScore: 9.9,
      inputParameters: {
        payloadText: { type: 'string', description: 'Raw JSON or text payload returned from external seller agent' },
        sensitivityMode: { type: 'string', enum: ['strict', 'moderate', 'permissive'], description: 'Firewall inspection depth' },
      },
      sampleOutput: {
        threatDetected: false,
        sanitizedText: '[CLEANED_PAYLOAD]',
        riskScore: 0.02,
        injectionAttemptsBlocked: 0,
        firewallNode: 'x402-firewall-v1',
      },
    },
    {
      id: 'tool:agent_execution_proof_attestor',
      toolName: 'agent_execution_proof_attestor',
      displayName: 'Proof-of-Execution Attestor (Proof-of-Useful-Work)',
      category: 'execution-verification',
      description: 'Generates cryptographic step-telemetry and merkle execution trace commitments proving compute work was actually performed by seller agents.',
      priceAmountCents: 15,
      priceFormatted: '$0.15 USD',
      estimatedRoiScore: 9.7,
      inputParameters: {
        taskName: { type: 'string', description: 'Name of compute task' },
        inputHash: { type: 'string', description: 'SHA-256 hash of task input parameters' },
        outputHash: { type: 'string', description: 'SHA-256 hash of task output result' },
      },
      sampleOutput: {
        attestationId: 'att_proof_998811',
        workVerified: true,
        computeUnitsConsumed: 1420,
        executionTraceMerkleRoot: '0x8877665544332211',
        timestamp: Date.now(),
      },
    },
    {
      id: 'tool:agent_sla_micro_insurance',
      toolName: 'agent_sla_micro_insurance',
      displayName: 'Parametric SLA Micro-Insurance & Auto-Refund Node',
      category: 'sla-guarantee',
      description: 'Locks micro-bonds for seller tool calls. Automatically triggers instant buyer refunds and micro-penalties if seller latency exceeds SLA thresholds.',
      priceAmountCents: 5,
      priceFormatted: '$0.05 USD',
      estimatedRoiScore: 9.5,
      inputParameters: {
        sellerEndpoint: { type: 'string', description: 'Seller API endpoint being insured' },
        maxLatencyMs: { type: 'number', description: 'SLA latency threshold in milliseconds' },
        bondAmountUSD: { type: 'number', description: 'Micro-bond stake in USD' },
      },
      sampleOutput: {
        policyId: 'pol_sla_774411',
        status: 'ACTIVE_INSURED',
        latencyThresholdMs: 300,
        autoRefundTriggered: false,
        escrowBondLocked: '$1.00 USD',
      },
    },
    {
      id: 'tool:x402_atomic_pipeline_router',
      toolName: 'x402_atomic_pipeline_router',
      displayName: 'x402 Composable Multi-Agent Atomic Pipeline Router',
      category: 'pipeline-orchestration',
      description: 'Orchestrates multi-agent dependency DAGs with a single atomic x402 payment that automatically fans out and settles across sub-agent nodes.',
      priceAmountCents: 25,
      priceFormatted: '$0.25 USD',
      estimatedRoiScore: 9.3,
      inputParameters: {
        pipelineSteps: { type: 'string', description: 'JSON string of sub-agent dependency graph' },
        totalBudgetUSD: { type: 'number', description: 'Maximum total pipeline payment budget' },
      },
      sampleOutput: {
        pipelineId: 'pipe_atomic_552299',
        subAgentsContractedCount: 3,
        pipelineStatus: 'EXECUTED_SETTLED',
        totalSettledUSD: '$0.40 USD',
        rollbackTriggered: false,
      },
    },
  ];

  /**
   * Scans current ecosystem, compares against existing registered tools,
   * and returns the top high-ROI service candidate that has not yet been built.
   */
  public async scanForHighRoiOpportunities(existingToolNames: string[]): Promise<{
    scannedCategoriesCount: number;
    unmetDemandCount: number;
    recommendedBlueprint?: ServiceBlueprint;
  }> {
    const existingSet = new Set(existingToolNames.map(t => t.toLowerCase()));

    const missingBlueprints = this.candidateBlueprints.filter(
      b => !existingSet.has(b.toolName.toLowerCase())
    );

    // Sort by ROI score descending
    missingBlueprints.sort((a, b) => b.estimatedRoiScore - a.estimatedRoiScore);

    return {
      scannedCategoriesCount: 5,
      unmetDemandCount: missingBlueprints.length,
      recommendedBlueprint: missingBlueprints[0],
    };
  }
}
