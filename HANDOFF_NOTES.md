# HANDOFF NOTES & PROJECT STATE FOR FUTURE AI AGENTS

> **IMPORTANT NOTICE FOR ALL FUTURE AGENTS**: Read this document and `GEMINI.md` completely before taking any actions on this codebase.

---

## 1. Project Overview & Vision

This project (`x402-mcp`) is an **Autonomous Seller MCP Platform & Service Factory** designed for agent-to-agent (A2A) commerce:
- **x402 HTTP Transport v2 Protocol**: Enforces base64 `PAYMENT-REQUIRED` response headers for machine micropayments.
- **Bazaar Discovery Protocol**: Exposes machine-readable capabilities via `/.well-known/bazaar.json`.
- **Model Context Protocol (MCP)**: Exposes monetized tools via HTTP (`/mcp/v1/call`) and Stdio transports.
- **Local Desktop DeepSeek Integration**: Connected to local desktop Ollama (`http://localhost:11434/v1`) using `deepseek-coder:latest`.
- **Autonomous 12-Hour Scanner**: Automated market demand scanner that synthesizes non-crypto killer agent infrastructure tools end-to-end.

---

## 2. DEEP DEPENDENCY-LEVEL RESILIENCE & FACT-CHECKING (MANDATORY)

- 🔴 **DEEP DEPENDENCY RESILIENCE ALWAYS**: Surface-level container health checks are INSUFFICIENT. All infrastructure features MUST implement deep, dependency-level health probes and active failover:
  - **Base RPC (CRITICAL)**: Test `eth_chainId` (8453). Auto-failover across backup pool (`mainnet.base.org`, `llamarpc`, `1rpc`, `drpc`).
  - **Redis (CRITICAL)**: Test `PING`. If down, reject incoming tool calls with **HTTP 503 Service Unavailable** to prevent nonce replay attacks.
  - **Postgres (HIGH)**: Connection query (`SELECT 1`) test with **3x exponential backoff retries** (100ms -> 300ms -> 900ms) before flagging degraded.
- 🔴 **FACT-CHECK & DOUBLE-CHECK EVERYTHING**: Every agent must audit and verify live HTTP status codes, headers, and failover behavior before marking any task as complete.

---

## 3. STRICT SECURITY & PRIVACY DIRECTIVES (CRITICAL)

- 🔴 **NEVER COMMIT WALLET ADDRESSES OR SECRETS TO GIT**: Real wallet addresses, API keys, and HMAC secrets MUST NEVER be placed in tracked Git files (`manifest.json`, source code, or commit messages).
- 🟢 **LOCAL `.env` ISOLATION**: Real credentials belong strictly in the git-ignored local `.env` file. Tracked files (`.env.example`, `manifest.json`) MUST ONLY contain generic placeholders like `"0xMERCHANT_WALLET_ADDRESS"`.
- 🟢 **DYNAMIC RUNTIME LOADING**: Code ([`bazaar/catalog.ts`](file:///C:/Users/mrmou/.gemini/antigravity/scratch/x402-mcp/bazaar/catalog.ts)) dynamically injects `process.env.MERCHANT_PAYMENT_ADDRESS` at runtime.
- 🟢 **PRE-COMMIT AUDIT**: Before executing `git commit` or `git push`, ALWAYS run `git status` and `git grep` to verify no wallet address or secret is tracked.

---

## 4. Current Live Services (9 Total)

1. `agent_context_firewall` (`$0.10 USD`) - Sanitizes incoming data payloads for prompt injections and jailbreaks.
2. `agent_execution_proof_attestor` (`$0.15 USD`) - Cryptographic Proof-of-Useful-Work trace attestation.
3. `x402_atomic_pipeline_router` (`$0.25 USD`) - Orchestrates multi-agent dependency DAGs with a single atomic payment.
4. `agent_sla_micro_insurance` (`$0.05 USD`) - Locks micro-bonds for seller tools with auto-refund on SLA breach (>300ms).
5. `agent_code_security_auditor` (`$1.50 USD`) - Vulnerability scanning on agent code payloads.
6. `liquidity_arbitrage_predictor` (`$0.75 USD`) - Real-time DEX/CEX order book spread predictor.
7. `agent_escrow_service` (`$0.25 USD`) - Multi-sig conditional trade escrow contract.
8. `market_data_insights` (`$0.50 USD`) - Institutional quantitative market metrics & sentiment.
9. `agent_task_executor` (`$1.00 USD`) - Isolated compute sandbox execution.

---

## 5. Key Execution Commands

```bash
# Build TypeScript project (Must compile with 0 errors)
npm run build

# Run instant Market Scan & Tool Generator
npm run scan-and-create

# Run 12-Hour Automated Scanner Daemon
npm run seller-daemon

# Run Local DeepSeek Buyer Simulation
npm run deepseek
```
