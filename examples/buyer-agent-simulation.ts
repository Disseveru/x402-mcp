import { AgentCommerceMCPServer } from '../mcp/server';
import { AutonomousBuyerAgentClient } from '../x402/client';
import { BazaarCatalog } from '../bazaar/catalog';
import { MCP_TOOLS } from '../mcp/tools';

async function runEndToEndSimulation() {
  console.log('========================================================================');
  console.log('  GEMINI AGENT-COMMERCE-SUITE : AUTONOMOUS BUYER AGENT SIMULATION       ');
  console.log('========================================================================\n');

  // 1. Start MCP & Bazaar Server
  const mcpServer = new AgentCommerceMCPServer();
  const serverInstance = mcpServer.listenHttp(4020);

  // Allow server to initialize
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // 2. Test Container Health Probe Endpoint
    console.log('\n--- STEP 0: TESTING PRODUCTION HEALTH PROBE ENDPOINT ---');
    const healthRes = await fetch('http://localhost:4020/health');
    const healthData = (await healthRes.json()) as any;
    console.log('[Health Check Status]:', healthData.status);
    console.log('[Health Probe Output]:', JSON.stringify(healthData, null, 2));

    // 3. Discover capabilities via Bazaar Catalog
    console.log('\n--- STEP 1: DISCOVERING CAPABILITIES VIA BAZAAR PROTOCOL ---');
    const manifest = BazaarCatalog.getManifest();
    console.log(`[Bazaar Provider] ${manifest.provider.name} - ${manifest.provider.description}`);
    console.log(`[Bazaar Payment Address] ${manifest.provider.paymentAddress}`);
    console.log(`[Bazaar Capabilities Found]: ${manifest.capabilities.length} tools`);
    manifest.capabilities.forEach((cap: any) => {
      console.log(`  • [${cap.id}] ${cap.name}: ${cap.description} (${cap.price.formatted})`);
    });

    // 4. Initialize Autonomous Gemini Buyer Agent
    console.log('\n--- STEP 2: INITIALIZING AUTONOMOUS GEMINI BUYER AGENT WITH X402 WALLET ---');
    const buyerAgent = new AutonomousBuyerAgentClient('0xGeminiBuyerAgent_0x998877665544332211');

    // 5. Scenario A: Request Monetized Market Intelligence Tool
    console.log('\n--- STEP 3: EXECUTING MONETIZED TOOL 1 - market_data_insights ---');
    const marketDataResult = await buyerAgent.executeMonetizedCall(async (paymentProof) => {
      const toolDef = MCP_TOOLS['market_data_insights'];
      return await toolDef.handler(
        {
          ticker: 'BTC',
          timeframe: '24h',
          metrics: ['volatility', 'sentiment', 'whale_flow'],
        },
        paymentProof
      );
    });

    console.log('\n[SUCCESS] Received Settled Service Response for market_data_insights:');
    console.log('Receipt:', JSON.stringify(marketDataResult.receipt, null, 2));
    console.log('Data:', JSON.stringify(marketDataResult.data, null, 2));

    // 6. Scenario B: Request Security Audit Tool
    console.log('\n--- STEP 4: EXECUTING MONETIZED TOOL 4 - agent_code_security_auditor ---');
    const auditResult = await buyerAgent.executeMonetizedCall(async (paymentProof) => {
      const toolDef = MCP_TOOLS['agent_code_security_auditor'];
      return await toolDef.handler(
        {
          code: 'function execute(payload) { return eval(payload); }',
          strictness: 'high',
        },
        paymentProof
      );
    });

    console.log('\n[SUCCESS] Received Settled Security Audit Result:');
    console.log('Receipt:', JSON.stringify(auditResult.receipt, null, 2));
    console.log('Audit Report:', JSON.stringify(auditResult.data, null, 2));

    console.log('\n========================================================================');
    console.log('  E2E SIMULATION COMPLETED SUCCESSFULLY - ALL MONETIZED TOOLS SETTLED   ');
    console.log('========================================================================\n');

  } catch (error) {
    console.error('Simulation Error:', error);
  } finally {
    serverInstance.close();
  }
}

if (require.main === module) {
  runEndToEndSimulation();
}
