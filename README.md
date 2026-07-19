# Agent Commerce Suite (`agent-commerce-suite`)

Production-grade suite of monetized tools for autonomous AI agent-to-agent commerce built with:
- **x402 Protocol**: Standard HTTP 402 Payment Required negotiation & cryptographic proof settlement.
- **Bazaar Extension**: Machine-readable capabilities discovery & catalog protocol (`/.well-known/bazaar.json`).
- **Model Context Protocol (MCP)**: Exposes monetized tools directly to Grok, Claude, and LLM agent frameworks.
- **xAI Plugin Marketplace Registration**: Native `xai-org/plugin-marketplace` integration manifest.

---

## 📁 Repository Structure

```
agent-commerce-suite/
├── services/                     # Core Monetized Production Tools
│   ├── data-insights.service.ts  # Quantitative Market Intelligence API ($0.50 USD)
│   ├── agent-executor.service.ts # Isolated Remote Task Sandbox ($1.00 USD)
│   └── escrow.service.ts         # Multi-sig Conditional Escrow Contract ($0.25 USD)
├── x402/                         # Payment Middleware & Protocol Layer
│   ├── types.ts                  # Protocol interfaces (Challenges, Proofs, Receipts)
│   ├── verifier.ts               # Cryptographic HMAC/Secp256k1 proof settlement
│   ├── middleware.ts             # Express & RPC HTTP 402 payment gate
│   └── client.ts                 # Autonomous Buyer Agent auto-payment client SDK
├── bazaar/                       # Resource Discovery & Capability Catalog
│   ├── manifest.json             # Bazaar standard metadata spec
│   ├── catalog.ts                # Capability search & price filter engine
│   └── discovery.ts              # HTTP endpoints for /.well-known/bazaar.json
├── mcp/                          # Model Context Protocol Layer
│   ├── tools.ts                  # MCP Tool definitions wrapped with x402 payment gates
│   └── server.ts                 # Dual Stdio & Express HTTP MCP Server for Grok
├── plugin/                       # Marketplace Integration Entry
│   ├── plugin.json               # Manifest compatible with xai-org/plugin-marketplace
│   └── manifest.ts               # Programmatic installer & exporter
├── examples/                     # Runnable E2E Verification
│   └── buyer-agent-simulation.ts # Complete autonomous agent buyer simulation
├── .env.example                  # Environment configuration
├── tsconfig.json                 # TypeScript compiler configuration
└── package.json                  # Dependencies & scripts
```

---

## ⚡ Quick Start & Run

### 1. Install Dependencies & Build

```bash
npm install
npm run build
```

### 2. Run End-to-End Autonomous Agent Simulation

```bash
npm run simulate
```

### 3. Start Production MCP & Bazaar Server

```bash
# HTTP Server (default port 4020)
npm start

# Or Stdio mode for local MCP host IDEs
npx ts-node mcp/server.ts --stdio
```

---

## 🛠️ Monetized Tools Summary

| Tool Name | Description | Price | Endpoint |
|---|---|---|---|
| `market_data_insights` | Real-time quantitative market metrics, volatility, & whale flow data | `$0.50 USD` | `/mcp/v1/call` |
| `agent_task_executor` | Remote task payload execution in isolated compute sandbox | `$1.00 USD` | `/mcp/v1/call` |
| `agent_escrow_service` | Multi-sig escrow creation & conditional fund locking | `$0.25 USD` | `/mcp/v1/call` |

---

## 🔌 xAI Plugin Marketplace Integration

This suite contains a ready-to-deploy plugin manifest compatible with `xai-org/plugin-marketplace`:
- Location: `plugin/plugin.json`
- Exporter script: `npm run plugin-export` or `npx ts-node plugin/manifest.ts`

---

## 📄 License
MIT License. Built for autonomous agent commerce.
