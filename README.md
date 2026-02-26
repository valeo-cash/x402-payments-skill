# x402 Payments Skill

The first x402 developer skill for AI coding agents. Teaches Claude Code, Codex, Cursor, Windsurf, and Gemini CLI how to build x402 payment infrastructure — not just consume it.

## What it does

One install. Your AI agent knows how to:

- **Monetize any API** with x402 middleware (Next.js, Express, Hono)
- **Call paid endpoints** with automatic 402 payment handling
- **Deploy on Base AND Solana** with USDC
- **Orchestrate multi-endpoint payments** with [@x402sentinel/router](https://www.npmjs.com/package/@x402sentinel/router)
- **Generate unified cryptographic receipts** with budget enforcement and audit trails

## Install

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
