# HANDOFF NOTES & PROJECT STATE FOR FUTURE AI AGENTS

> **IMPORTANT NOTICE FOR ALL FUTURE AGENTS**: Read this document and `GEMINI.md` completely before taking any actions on this codebase.

---

## 1. Project Overview & Vision

This project (`x402-mcp`) is an **Autonomous Seller MCP Platform & Service Factory** designed for agent-to-agent (A2A) commerce:
- **x402 HTTP Transport v2 Protocol**: Enforces base64 `PAYMENT-REQUIRED` response headers for machine micropayments.
- **Bazaar Discovery Protocol**: Exposes machine-readable capabilities via `/.well-known/bazaar.json`
- **Model Context Protocol (MCP)**: Exposes monetized tools via HTTP (`/mcp/v1/call`) and Stdio transports.
- **Local Desktop DeepSeek Integration**: Connected to local desktop Ollama (`http://localhost:11434/v1`) using `deepseek-coder:latest`.
- **Autonomous 12-Hour Scanner**: Automated market demand scanner that synthesizes non-crypto killer agent infrastructure tools end-to-end.

---

## 2. Railway Deployment & CLI Configuration (CRITICAL FOR AGENTS)

- 🟢 **Live Production Domain**: [https://x402-mcp-production.up.railway.app](https://x402-mcp-production.up.railway.app)
- 🟢 **Health Check**: [https://x402-mcp-production.up.railway.app/health](https://x402-mcp-production.up.railway.app/health)
- 🟢 **Bazaar Discovery Specification**: [https://x402-mcp-production.up.railway.app/.well-known/bazaar.json](https://x402-mcp-production.up.railway.app/.well-known/bazaar.json)
- 🟢 **Railway Account**: Erick Rosas (`mrmousers91@gmail.com`)
- 🟢 **Workspace**: `Erick Rosas's Projects`
- 🟢 **Project Name**: `x402 Commerce` (`cd71c5bb-d918-4ca8-9c6f-a1c8667bb31d`)
- 🟢 **Linked Service**: `x402-mcp` (`3141076d-315d-47f8-9fed-2a18480cec44`)

> ⚠️ **CRITICAL WARNING FOR FUTURE AGENTS ON RAILWAY CLI AUTHENTICATION**:
> - DO NOT set invalid UUIDs or random tokens into Windows User Environment Variables (`RAILWAY_TOKEN` or `RAILWAY_API_TOKEN`). Setting invalid environment variables overrides CLI login credentials and breaks all `railway` commands with `Unauthorized / Invalid RAILWAY_TOKEN`.
> - If `railway` commands fail with `Unauthorized`, ALWAYS run this cleanup in PowerShell first:
>   ```powershell
>   Remove-Item Env:\RAILWAY_TOKEN -ErrorAction SilentlyContinue
>   Remove-Item Env:\RAILWAY_API_TOKEN -ErrorAction SilentlyContinue
>   [Environment]::SetEnvironmentVariable("RAILWAY_TOKEN", $null, "User")
>   [Environment]::SetEnvironmentVariable("RAILWAY_API_TOKEN", $null, "User")
>   ```
> - To re-authenticate if session ever expires, run `railway login --browserless` or `railway login`.

---

## 3. DEEP DEPENDENCY-LEVEL RESILIENCE & FACT-CHECKING (MANDATORY)

- 🔴 **DEEP DEPENDENCY RESILIENCE ALWAYS**: Surface-level container health checks are INSUFFICIENT. All infrastructure features MUST implement deep, dependency-level health probes and active failover:
  - **Base RPC (CRITICAL)**: Test `eth_chainId` (8453). Auto-failover across backup pool (`mainnet.base.org`, `llamarpc`, `1rpc`, `drpc`).
  - **Redis (CRITICAL)**: Test `PING`. If down, reject incoming tool calls with **HTTP 503 Service Unavailable** to prevent nonce replay attacks.
  - **Postgres (HIGH)**: Connection query (`SELECT 1`) test with **3x exponential backoff retries** (100ms -> 300ms -> 900ms) before flagging degraded.
- 🔴 **FACT-CHECK & DOUBLE-CHECK EVERYTHING**: Every agent must audit and verify live HTTP status codes, headers, and failover behavior before marking any task as complete.

---

## 4. Current Live Services (9 Total)

1. `agent_context_firewall` (`$0.40 USD`) - Sanitizes incoming data payloads for prompt injections and jailbreaks.
2. `agent_execution_proof_attestor` (`$0.35 USD`) - Cryptographic Proof-of-Useful-Work trace attestation.
3. `x402_atomic_pipeline_router` (`$0.25 USD`) - Orchestrates multi-agent dependency DAGs with a single atomic payment.
4. `agent_sla_micro_insurance` (`$0.50 USD`) - Locks micro-bonds for seller tools with auto-refund on SLA breach (>300ms).
5. `agent_code_security_auditor` (`$0.75 USD`) - Vulnerability scanning on agent code payloads.
6. `liquidity_arbitrage_predictor` (`$0.60 USD`) - Real-time DEX/CEX order book spread predictor.
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

# Check Railway project status
railway status

# View live Railway logs
railway logs

# SSH into Railway container
railway ssh
```

