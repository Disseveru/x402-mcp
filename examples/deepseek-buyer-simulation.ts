import { AgentCommerceMCPServer } from '../mcp/server';
import { AutonomousBuyerAgentClient } from '../x402/client';
import { DeepSeekAgentService } from '../services/deepseek-agent.service';
import { MCP_TOOLS } from '../mcp/tools';

async function runDeepSeekSimulation() {
  console.log('========================================================================');
  console.log('  LOCAL DEEPSEEK + AGENT-COMMERCE-SUITE : AUTONOMOUS BUYER SIMULATION  ');
  console.log('========================================================================\n');

  // 1. Initialize Local DeepSeek Service
  const deepseek = new DeepSeekAgentService();
  const health = await deepseek.checkHealth();
  console.log(`[DeepSeek Diagnostic] ${health.message}\n`);

  // 2. Start Local HTTP Server for MCP & x402
  const server = new AgentCommerceMCPServer();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4025;
  const listener = server.listenHttp(port);
  const baseUrl = `http://localhost:${port}`;

  try {
    // 3. Discover available Bazaar & MCP capabilities
    console.log('--- STEP 1: DISCOVERING CAPABILITIES FOR LOCAL DEEPSEEK ---');
    const toolsRes = await fetch(`${baseUrl}/mcp/v1/tools`);
    const { tools } = (await toolsRes.json()) as any;
    console.log(`Found ${tools.length} available monetized tools.\n`);

    // 4. User prompt given to Local DeepSeek
    const userGoal = 'I need real-time market data insights for BTC including volatility and sentiment analysis.';
    console.log(`--- STEP 2: LOCAL DEEPSEEK REASONING ---`);
    console.log(`User Input Goal: "${userGoal}"`);

    const decision = await deepseek.reasonAndSelectTool(userGoal, tools);
    console.log(`[DeepSeek Decision] Selected Tool: '${decision.toolName}'`);
    console.log(`[DeepSeek Decision] Reasoning: ${decision.reasoning || 'N/A'}`);
    console.log(`[DeepSeek Decision] Generated Parameters:`, JSON.stringify(decision.arguments, null, 2));
    console.log('');

    // 5. Execute Tool via x402 Autonomous Buyer Client
    console.log(`--- STEP 3: EXECUTING MONETIZED TOOL WITH X402 PAYMENT ---`);
    const buyerClient = new AutonomousBuyerAgentClient('0xDeepSeekLocalAgent_0x112233445566778899');

    const result = await buyerClient.executeMonetizedCall(async (paymentProof) => {
      const response = await fetch(`${baseUrl}/mcp/v1/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: decision.toolName,
          arguments: decision.arguments,
          paymentProof,
        }),
      });

      const json: any = await response.json();
      return json;
    });

    console.log('\n[SUCCESS] Final Execution Result Delivered to Local DeepSeek:');
    console.log(JSON.stringify(result, null, 2));

  } finally {
    listener.close();
    console.log('\n========================================================================');
    console.log('  LOCAL DEEPSEEK SIMULATION COMPLETED SUCCESSFULLY                       ');
    console.log('========================================================================');
  }
}

if (require.main === module) {
  runDeepSeekSimulation().catch(console.error);
}
