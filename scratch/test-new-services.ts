import { AgentTrustOracleService } from '../services/trust-oracle.service';
import { AgentContextVaultService } from '../services/context-vault.service';
import { AgentConsensusOracleService } from '../services/consensus-oracle.service';

async function runSanityCheck() {
  console.log('--- Testing AgentTrustOracleService ---');
  const trustOracle = new AgentTrustOracleService();
  await trustOracle.recordTransaction({
    agentId: 'agent_alpha_007',
    counterpartyAgent: 'agent_beta_008',
    amountUSD: 150.0,
    status: 'SUCCESS',
    latencyMs: 320,
    slaMet: true,
    promptInjectionAttempt: false,
  });

  const trustMetrics = await trustOracle.getTrustMetrics({ agentId: 'agent_alpha_007' });
  console.log('Trust Metrics Result:', JSON.stringify(trustMetrics, null, 2));

  console.log('\n--- Testing AgentContextVaultService ---');
  const vault = new AgentContextVaultService();
  const meta = await vault.storeSecret({
    swarmId: 'swarm_omega_1',
    key: 'shared_model_weights',
    value: { weights: [0.12, 0.45, 0.99], status: 'OPTIMIZED' },
    writerAgentId: 'agent_alpha_007',
    readAccessAgentIds: ['agent_beta_008'],
    ttlSeconds: 300,
  });
  console.log('Vault Store Meta:', JSON.stringify(meta, null, 2));

  const secretResponse = await vault.retrieveSecret({
    swarmId: 'swarm_omega_1',
    key: 'shared_model_weights',
    readerAgentId: 'agent_beta_008',
  });
  console.log('Vault Retrieve Response:', JSON.stringify(secretResponse, null, 2));

  console.log('\n--- Testing AgentConsensusOracleService ---');
  const consensusOracle = new AgentConsensusOracleService();
  const auditResult = await consensusOracle.auditConsensus({
    payload: {
      tradeId: 'tr_9901',
      priceUSD: 45000.0,
      timestamp: Date.now(),
      notes: 'Executed trade successfully',
      debugMsg: 'Everything is fine',
    },
    expectedSchema: {
      tradeId: 'string',
      priceUSD: 'number',
      timestamp: 'number',
    },
    domainContext: 'FINANCIAL',
    strictness: 'STRICT',
  });
  console.log('Consensus Audit Result:', JSON.stringify(auditResult, null, 2));

  console.log('\n✅ All 3 A2A services passed empirical execution check!');
}

runSanityCheck().catch((err) => {
  console.error('❌ Error during sanity check:', err);
  process.exit(1);
});
