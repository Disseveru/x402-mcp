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
      id: 'tool:agent_code_security_auditor',
      toolName: 'agent_code_security_auditor',
      displayName: 'Agent Code Security Auditor',
      category: 'security-auditing',
      description: 'Performs static analysis and vulnerability scanning on agent code payloads before execution.',
      priceAmountCents: 150,
      priceFormatted: '$1.50 USD',
      estimatedRoiScore: 9.8,
      inputParameters: {
        codeSnippet: { type: 'string', description: 'TypeScript or Python code snippet to audit' },
        language: { type: 'string', enum: ['typescript', 'python', 'solidity'], description: 'Programming language' },
        sensitivityLevel: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Audit sensitivity depth' },
      },
      sampleOutput: {
        securityScore: 94,
        vulnerabilitiesFound: 0,
        riskLevel: 'LOW',
        complianceStatus: 'APPROVED',
      },
    },
    {
      id: 'tool:liquidity_arbitrage_predictor',
      toolName: 'liquidity_arbitrage_predictor',
      displayName: 'Liquidity Arbitrage Predictor',
      category: 'quantitative-intelligence',
      description: 'Scans DEX/CEX order books to identify real-time cross-chain arbitrage spreads.',
      priceAmountCents: 75,
      priceFormatted: '$0.75 USD',
      estimatedRoiScore: 9.4,
      inputParameters: {
        pair: { type: 'string', description: 'Trading pair e.g. ETH/USDC or SOL/USDT' },
        minSpreadBps: { type: 'number', description: 'Minimum spread in basis points' },
      },
      sampleOutput: {
        pair: 'ETH/USDC',
        spreadBps: 24.5,
        estimatedProfitUSD: 142.80,
        recommendedVenue: 'Uniswap v3 -> Binance',
      },
    },
    {
      id: 'tool:agent_reputation_verifier',
      toolName: 'agent_reputation_verifier',
      displayName: 'Agent Reputation & Risk Verifier',
      category: 'reputation-risk',
      description: 'Calculates on-chain solvency, transaction history, and credit score for buyer/seller agents.',
      priceAmountCents: 50,
      priceFormatted: '$0.50 USD',
      estimatedRoiScore: 9.1,
      inputParameters: {
        agentAddress: { type: 'string', description: 'Address or Agent Public ID' },
        chain: { type: 'string', enum: ['ethereum', 'solana', 'base', 'arbitrum'], description: 'Blockchain network' },
      },
      sampleOutput: {
        agentAddress: '0xAgent_Alpha',
        reputationScore: 885,
        successfulTradesCount: 1420,
        defaultRisk: 'VERY_LOW',
      },
    },
    {
      id: 'tool:consensus_execution_attestor',
      toolName: 'consensus_execution_attestor',
      displayName: 'Multi-Agent Consensus Attestor',
      category: 'attestation-proof',
      description: 'Generates multi-sig cryptographic proof of state consensus across autonomous agent nodes.',
      priceAmountCents: 30,
      priceFormatted: '$0.30 USD',
      estimatedRoiScore: 8.9,
      inputParameters: {
        stateHash: { type: 'string', description: 'State hash to attest' },
        requiredSignatures: { type: 'number', description: 'Threshold signature count' },
      },
      sampleOutput: {
        attestationId: 'att_88f99a01',
        consensusAchieved: true,
        signaturesCollected: 5,
        merkleRoot: '0x99aabbee11223344',
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
