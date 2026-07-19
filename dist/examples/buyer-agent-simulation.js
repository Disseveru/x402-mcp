"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../mcp/server");
const client_1 = require("../x402/client");
const catalog_1 = require("../bazaar/catalog");
const tools_1 = require("../mcp/tools");
async function runEndToEndSimulation() {
    console.log('========================================================================');
    console.log('  GEMINI AGENT-COMMERCE-SUITE : AUTONOMOUS BUYER AGENT SIMULATION       ');
    console.log('========================================================================\n');
    // 1. Start MCP & Bazaar Server
    const mcpServer = new server_1.AgentCommerceMCPServer();
    const serverInstance = mcpServer.listenHttp(4020);
    // Allow server to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
        // 2. Discover capabilities via Bazaar Catalog
        console.log('\n--- STEP 1: DISCOVERING CAPABILITIES VIA BAZAAR PROTOCOL ---');
        const manifest = catalog_1.BazaarCatalog.getManifest();
        console.log(`[Bazaar Provider] ${manifest.provider.name} - ${manifest.provider.description}`);
        console.log(`[Bazaar Capabilities Found]: ${manifest.capabilities.length} tools`);
        manifest.capabilities.forEach((cap) => {
            console.log(`  • [${cap.id}] ${cap.name}: ${cap.description} (${cap.price.formatted})`);
        });
        // 3. Initialize Autonomous Gemini Buyer Agent
        console.log('\n--- STEP 2: INITIALIZING AUTONOMOUS GEMINI BUYER AGENT WITH X402 WALLET ---');
        const buyerAgent = new client_1.AutonomousBuyerAgentClient('0xGeminiBuyerAgent_0x998877665544332211');
        // 4. Scenario A: Request Monetized Market Intelligence Tool
        console.log('\n--- STEP 3: EXECUTING MONETIZED TOOL 1 - market_data_insights ---');
        const marketDataResult = await buyerAgent.executeMonetizedCall(async (paymentProof) => {
            const toolDef = tools_1.MCP_TOOLS['market_data_insights'];
            return await toolDef.handler({
                ticker: 'BTC',
                timeframe: '24h',
                metrics: ['volatility', 'sentiment', 'whale_flow'],
            }, paymentProof);
        });
        console.log('\n[SUCCESS] Received Settled Service Response for market_data_insights:');
        console.log('Receipt:', JSON.stringify(marketDataResult.receipt, null, 2));
        console.log('Data:', JSON.stringify(marketDataResult.data, null, 2));
        // 5. Scenario B: Request Monetized Remote Agent Execution Sandbox Tool
        console.log('\n--- STEP 4: EXECUTING MONETIZED TOOL 2 - agent_task_executor ---');
        const executorResult = await buyerAgent.executeMonetizedCall(async (paymentProof) => {
            const toolDef = tools_1.MCP_TOOLS['agent_task_executor'];
            return await toolDef.handler({
                taskName: 'Sentiment Summary Synthesis',
                codeOrInstructions: 'analyze real-time whale flow data and summarize trade signal for Grok',
            }, paymentProof);
        });
        console.log('\n[SUCCESS] Received Settled Execution Output for agent_task_executor:');
        console.log('Receipt:', JSON.stringify(executorResult.receipt, null, 2));
        console.log('Execution Result:', JSON.stringify(executorResult.data, null, 2));
        // 6. Scenario C: Request Monetized Escrow Contract Creation
        console.log('\n--- STEP 5: EXECUTING MONETIZED TOOL 3 - agent_escrow_service ---');
        const escrowResult = await buyerAgent.executeMonetizedCall(async (paymentProof) => {
            const toolDef = tools_1.MCP_TOOLS['agent_escrow_service'];
            return await toolDef.handler({
                buyerAgent: '0xGrokBuyerAgent_0x8899AABBCCDD',
                sellerAgent: '0xDataNodeSellerAgent_0x1122334455',
                amountUSD: 250.00,
                conditions: 'Release funds upon delivery of validated dataset checksum',
            }, paymentProof);
        });
        console.log('\n[SUCCESS] Received Settled Escrow State for agent_escrow_service:');
        console.log('Receipt:', JSON.stringify(escrowResult.receipt, null, 2));
        console.log('Escrow Contract:', JSON.stringify(escrowResult.data, null, 2));
        console.log('\n========================================================================');
        console.log('  E2E SIMULATION COMPLETED SUCCESSFULLY - ALL MONETIZED TOOLS SETTLED   ');
        console.log('========================================================================\n');
    }
    catch (error) {
        console.error('Simulation Error:', error);
    }
    finally {
        serverInstance.close();
    }
}
if (require.main === module) {
    runEndToEndSimulation();
}
