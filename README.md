[![Validate Skill](https://github.com/valeo-cash/x402-payments-skill/actions/workflows/validate.yml/badge.svg)](https://github.com/valeo-cash/x402-payments-skill/actions/workflows/validate.yml)

[![x402 Compatible](https://img.shields.io/badge/x402-compatible-0052FF?style=for-the-badge&logo=coinbase&logoColor=white)](https://x402.org)
[![Sentinel Router](https://img.shields.io/badge/Sentinel-Router-8B5CF6?style=for-the-badge)](https://www.npmjs.com/package/@x402sentinel/router)
[![Agent Skill](https://img.shields.io/badge/Agent_Skill-SKILL.md-F97316?style=for-the-badge)](https://agentskills.io)

# x402 Payments Skill

The most comprehensive x402 payments skill for AI coding agents. Teaches Claude Code, Codex, Cursor, Windsurf, and Gemini CLI how to build x402 payment infrastructure — not just consume it.

## What it does

One install. Your AI agent knows how to:

- **Monetize any API** with x402 middleware (Next.js, Express, Hono)
- **Call paid endpoints** with automatic 402 payment handling
- **Deploy on Base AND Solana** with USDC
- **Orchestrate multi-endpoint payments** with [@x402sentinel/router](https://www.npmjs.com/package/@x402sentinel/router)
- **Generate unified cryptographic receipts** with budget enforcement and audit trails

## Quick Install

```bash
curl -sSL https://raw.githubusercontent.com/valeo-cash/x402-payments-skill/main/install.sh | bash
```

Auto-detects Claude Code, Codex CLI, and Cursor. Installs the skill to the right location.

## Live Examples

Two ready-to-clone projects in `examples/`:

### Seller: Paid Joke API

A Next.js API charging $0.001/request in USDC on Base Sepolia.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvaleo-cash%2Fx402-payments-skill%2Ftree%2Fmain%2Fexamples%2Fpaid-api-seller&env=WALLET_ADDRESS&envDescription=Your%20wallet%20address%20to%20receive%20USDC%20payments&project-name=x402-paid-api)

```bash
cd examples/paid-api-seller && npm install && npm run dev
```

### Buyer: Pay for APIs

Node.js scripts that call paid endpoints — single and multi-endpoint with Sentinel Router.

```bash
cd examples/pay-for-api-buyer && npm install && npm run single
```

[→ See all examples](./examples/)

## What's Inside the Skill

The skill teaches your AI agent a decision tree:

```
User asks about x402 / paid APIs / agent payments
  │
  ├─ Are you the SELLER or BUYER?
  │   ├─ Seller → Server middleware setup
  │   └─ Buyer → Client fetch wrapper
  │
  ├─ Which CHAIN?
  │   ├─ Base (EVM) → x402-next / @x402/next
  │   ├─ Solana → x402-solana / @x402/svm
  │   └─ Both → V2 multi-chain registration
  │
  └─ Need MULTI-ENDPOINT orchestration?
      ├─ No → Basic x402 is enough
      └─ Yes → Sentinel Payment Router
              → Budget caps
              → Parallel execution
              → Unified cryptographic receipts
```

Full reference docs for every path: Base/EVM, Solana, Sentinel Router, and all 20+ npm packages in the x402 ecosystem.

## Install

### Claude.ai (Web / Mobile)

1. Download [x402-payments.skill](https://github.com/valeo-cash/x402-payments-skill/releases/latest/download/x402-payments.skill)
2. Go to **Settings → Skills**
3. Upload the file

### Claude Code (Plugin Marketplace)

```bash
/plugin marketplace add valeo-cash/x402-payments-skill
```

### Claude Code (Manual)

```bash
git clone https://github.com/valeo-cash/x402-payments-skill.git
cp -r x402-payments-skill/x402-payments ~/.claude/skills/
```

### Codex CLI

```bash
git clone https://github.com/valeo-cash/x402-payments-skill.git
cp -r x402-payments-skill/x402-payments ~/.codex/skills/
```

### Cursor / Windsurf

Copy `.cursorrules` into your project root:

```bash
cp x402-payments-skill/.cursorrules ./
```

### Per-project (shared via git)

```bash
cp -r x402-payments-skill/x402-payments .claude/skills/
```

## What's inside

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill — decision tree, quick starts for seller/buyer on Base/Solana |
| `references/base-evm.md` | Complete Base/EVM server + client setup (V1 + V2 packages) |
| `references/solana.md` | Complete Solana server + client setup (Wallet Adapter, Privy, Node.js) |
| `references/sentinel-router.md` | Payment Router — multi-endpoint orchestration, budget caps, receipts |
| `references/packages.md` | Every x402 + Sentinel npm package with install commands |
| `.cursorrules` | Drop-in rules file for Cursor/Windsurf projects |
| `examples/paid-api-seller/` | Ready-to-deploy Next.js paid API (Vercel one-click) |
| `examples/pay-for-api-buyer/` | Node.js scripts for calling paid APIs + Sentinel Router |

## x402 Protocol

[x402](https://x402.org) is an open payment protocol by Coinbase using HTTP 402 status codes. Any API can charge per-request in USDC — no API keys, no subscriptions, no accounts. Works for humans and AI agents.

## Sentinel Payment Router

[@x402sentinel/router](https://www.npmjs.com/package/@x402sentinel/router) adds enterprise infrastructure on top of x402:

- **Budget enforcement** — set a cap before any money moves
- **Parallel execution** — pay multiple endpoints concurrently
- **Unified receipts** — SHA-256 hash + HMAC signature linking all payments
- **Audit trails** — cryptographic proof of what was paid, to whom, when

```typescript
import { PaymentRouter } from "@x402sentinel/router";

const router = new PaymentRouter({
  paymentFetch: x402Fetch,
  getPaymentInfo: () => x402Fetch.getLastPayment?.() ?? null,
  agentId: "research-agent-01",
  apiKey: "sk_...",
});

const result = await router.execute({
  name: "research-pipeline",
  maxBudgetUsd: "0.10",
  strategy: "parallel",
  endpoints: [
    { label: "email-verify", url: "https://api.example.com/verify?email=test@gmail.com" },
    { label: "dns-lookup", url: "https://api.example.com/dns?domain=google.com" },
    { label: "ssl-check", url: "https://api.example.com/ssl?domain=google.com" },
  ],
});
// result.receipt → unified cryptographic proof of all 3 payments
```

## Compatibility

| Agent | Install method |
|-------|---------------|
| Claude Code | `/plugin marketplace add` or `~/.claude/skills/` |
| Codex CLI | `~/.codex/skills/` |
| Cursor | `.cursorrules` in project root |
| Windsurf | `.cursorrules` in project root |
| Gemini CLI | `.claude/skills/` (same format) |
| OpenCode | `.claude/skills/` |

## Built by

[Sentinel by Valeo](https://sentinel.valeocash.com) — Audit and compliance infrastructure for AI agent payments.

## License

MIT
