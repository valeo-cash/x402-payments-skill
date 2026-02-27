# x402 Package Reference

Complete package matrix for the x402 ecosystem.

---

## V1 Packages (Simple)

The fastest path to x402. One package per framework, minimal config.

| Package | Purpose | Install |
|---------|---------|---------|
| `x402-next` | Next.js server middleware | `npm install x402-next` |
| `x402-express` | Express server middleware | `npm install x402-express` |
| `x402-fetch` | Client fetch wrapper (auto-handles 402) | `npm install x402-fetch` |
| `x402-axios` | Client axios wrapper | `npm install x402-axios` |
| `x402-solana` | Solana client + server | `npm install x402-solana` |
| `x402-mcp` | MCP server with paid tools | `npm install x402-mcp` |

---

## V2 Packages (Modular)

Multi-chain support, lifecycle hooks, and modular scheme registration. Use when you need Base + Solana or advanced configuration.

### Core

| Package | Purpose | Install |
|---------|---------|---------|
| `@x402/core` | Core types, facilitator client, resource server | `npm install @x402/core` |

### Chain Modules

| Package | Chain | Install |
|---------|-------|---------|
| `@x402/evm` | Base, Ethereum, Polygon, Arbitrum | `npm install @x402/evm` |
| `@x402/svm` | Solana | `npm install @x402/svm` |

### Framework Integrations

| Package | Framework | Install |
|---------|-----------|---------|
| `@x402/next` | Next.js (V2) | `npm install @x402/next` |
| `@x402/express` | Express (V2) | `npm install @x402/express` |
| `@x402/hono` | Hono (V2) | `npm install @x402/hono` |

### Client Libraries

| Package | Purpose | Install |
|---------|---------|---------|
| `@x402/fetch` | V2 fetch wrapper | `npm install @x402/fetch` |
| `@x402/axios` | V2 axios wrapper | `npm install @x402/axios` |

### UI

| Package | Purpose | Install |
|---------|---------|---------|
| `@x402/paywall` | Paywall UI components | `npm install @x402/paywall` |

---

## Sentinel Packages

Enterprise audit and orchestration infrastructure.

| Package | Purpose | Install |
|---------|---------|---------|
| `@x402sentinel/router` | Payment Router — multi-endpoint orchestration, budget caps, unified receipts | `npm install @x402sentinel/router` |
| `@x402sentinel/test` | CLI tool to test any x402 endpoint | `npx @x402sentinel/test https://your-api.com` |
| `@x402sentinel/x402` | Core Sentinel SDK — audit logging, budget policies | `npm install @x402sentinel/x402` |

---

## Chainlink CRE

Chainlink CRE (Chainlink Runtime Environment) is a decentralized execution layer for on-chain/off-chain workflows. CRE is not an npm package — it's a CLI tool + SDK.

| Tool | Purpose |
|------|---------|
| CRE CLI | Simulate and deploy CRE workflows |
| CRE SDK | Build workflow triggers and callbacks in TypeScript |
| Chainlink Price Feeds | On-chain price data (BTC, ETH, LINK, etc.) |
| Pushover API | Push notifications to mobile devices |

Install CRE CLI from: [docs.chain.link/cre/getting-started/cli-installation](https://docs.chain.link/cre/getting-started/cli-installation)

See `references/chainlink-cre.md` for the complete integration guide.

---

## Quick Install Commands

### Base only (V1 — simplest)

```bash
# Server
npm install x402-next

# Client
npm install x402-fetch viem
```

### Base only (V2 — modular)

```bash
# Server
npm install @x402/next @x402/core @x402/evm

# Client
npm install @x402/fetch viem
```

### Solana only

```bash
# Server + Client
npm install x402-solana @solana/web3.js
```

### Base + Solana (V2)

```bash
# Server
npm install @x402/next @x402/core @x402/evm @x402/svm

# Client (Base)
npm install @x402/fetch viem

# Client (Solana)
npm install x402-solana @solana/web3.js
```

### Full stack with Sentinel Router

```bash
# Server
npm install x402-next

# Client + Router
npm install x402-fetch viem @x402sentinel/router
```

---

## V1 vs V2 Decision Guide

| Criteria | V1 | V2 |
|----------|----|----|
| Setup speed | Fastest (1 package) | Moderate (2-3 packages) |
| Multi-chain | No | Yes (Base + Solana + more) |
| Lifecycle hooks | No | Yes |
| Framework support | Next.js, Express | Next.js, Express, Hono |
| Config format | `{ price, network }` | `{ accepts: [{ scheme, price, network, payTo }] }` |
| Network identifiers | `"base"`, `"base-sepolia"` | CAIP-2: `"eip155:8453"`, `"eip155:84532"` |
| Recommended for | Prototyping, single-chain | Production, multi-chain |

**Rule: Never mix V1 and V2 server packages in the same middleware stack.**

`x402-fetch` (V1 client) works with both V1 and V2 servers.

---

## Facilitator Options

The facilitator verifies payments and settles USDC on-chain.

| Facilitator | URL / Package | Auth | Notes |
|-------------|--------------|------|-------|
| x402.org (public) | `https://x402.org/facilitator` | None | Free, rate-limited |
| Coinbase CDP | `@coinbase/x402` | `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` | Higher limits |
| Self-hosted | Run your own | N/A | Full control |

### Using Coinbase CDP Facilitator

```bash
npm install @coinbase/x402
```

```typescript
import { createFacilitator } from "@coinbase/x402";

const facilitator = createFacilitator({
  apiKeyId: process.env.CDP_API_KEY_ID!,
  apiKeySecret: process.env.CDP_API_KEY_SECRET!,
});
```

---

## MCP Integration

`x402-mcp` creates an MCP server where tools require x402 payment.

```bash
npm install x402-mcp
```

```typescript
import { createPaidMcpHandler } from "x402-mcp";

const handler = createPaidMcpHandler({
  payTo: process.env.WALLET_ADDRESS!,
  network: "base",
  facilitator: { url: "https://x402.org/facilitator" },
  tools: {
    "analyze-text": {
      description: "Analyze text sentiment",
      price: "$0.01",
      handler: async (params) => {
        return { sentiment: "positive", confidence: 0.95 };
      },
    },
    "generate-summary": {
      description: "Generate text summary",
      price: "$0.05",
      handler: async (params) => {
        return { summary: "..." };
      },
    },
  },
});
```

---

## Compatibility Notes

- **Don't mix V1 and V2 server packages** in the same middleware stack
- **x402-fetch works with both V1 and V2 servers** — it detects the format automatically
- **Sentinel Router works with any x402 server** — it probes endpoints and handles payments generically
- **Node.js >= 18 required** for all packages
- **TypeScript recommended** — all packages ship type declarations
- **USDC only** — x402 requires EIP-3009 support, which only USDC has
