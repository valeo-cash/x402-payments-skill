# Chainlink CRE Reference

Integrate x402 payments with [Chainlink CRE](https://docs.chain.link/cre) (Chainlink Runtime Environment) to monetize decentralized workflows. CRE is an off-chain execution layer that combines EVM read/write, HTTP requests, Chainlink price feeds, and cron scheduling. x402 is the first AI payments partner for CRE — agents discover, trigger, and pay for CRE workflows using USDC micropayments.

---

## Quick Start

Gate a CRE workflow behind a $0.01 x402 paywall in under 5 minutes.

```bash
npm install express x402-express @chainlink/cre-sdk
```

```typescript
// server.ts
import express from "express";
import { paymentMiddleware } from "x402-express";

const app = express();
app.use(express.json());

app.use(
  paymentMiddleware(
    process.env.WALLET_ADDRESS!,
    {
      "/api/cre/trigger": {
        price: "$0.01",
        network: "base-sepolia",
        config: { description: "Trigger CRE workflow" },
      },
    },
    { url: "https://x402.org/facilitator" }
  )
);

app.post("/api/cre/trigger", async (req, res) => {
  const result = await fetch(process.env.CRE_WORKFLOW_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  res.json(await result.json());
});

app.listen(4021, () => console.log("x402 + CRE server on :4021"));
```

```bash
# Test with CRE local simulation
cre workflow simulate --target local-simulation
```

---

## Full Setup

The Quick Start covers the HTTP trigger path. A production CRE integration typically uses multiple trigger types:

| Trigger | When it fires | Use case |
|---------|--------------|----------|
| **HTTP** | x402-paid request hits the server | Write data on-chain, execute computation |
| **Cron** | Scheduled interval (e.g., hourly) | Monitor prices, check conditions, send alerts |
| **EVM Log** | On-chain event emitted | React to contract events, trigger follow-up workflows |

The full setup involves:

1. Express or Next.js server with x402 middleware (payment gate)
2. CRE workflow with `@chainlink/cre-sdk` (business logic)
3. Smart contract for on-chain state (optional, for Cron/EVM Log triggers)
4. Configuration via Zod schemas (`config.json`)

Install the full stack:

```bash
npm install express x402-express x402-fetch viem @chainlink/cre-sdk
```

---

## Server: Express (x402-Gated CRE Trigger)

The middleware **must** be mounted before the protected route. After x402 verifies payment, the handler forwards the request to the CRE workflow's HTTP trigger endpoint.

```bash
npm install express x402-express x402-fetch viem @chainlink/cre-sdk
```

```typescript
// server.ts
import express from "express";
import { paymentMiddleware } from "x402-express";
import { createHash } from "crypto";

const app = express();
app.use(express.json());

// Mount x402 middleware BEFORE protected routes
app.use(
  paymentMiddleware(
    process.env.WALLET_ADDRESS!,
    {
      "/api/alerts": {
        price: "$0.01",
        network: "base-sepolia",
        config: { description: "Create price alert via CRE" },
      },
    },
    { url: process.env.FACILITATOR_URL || "https://x402.org/facilitator" }
  )
);

// Free endpoint — LLM parses natural language into structured params
app.post("/api/chat", async (req, res) => {
  const { asset, condition, targetPriceUsd } = await parseWithLLM(req.body.message);
  // Call the paid endpoint using x402-fetch (see Client section)
  res.json({ asset, condition, targetPriceUsd });
});

// Paid endpoint — x402 payment verified before this handler runs
app.post("/api/alerts", async (req, res) => {
  const { asset, condition, targetPriceUsd } = req.body;

  const id = createHash("sha256")
    .update(`${asset}-${condition}-${targetPriceUsd}`)
    .digest("hex");

  const payload = {
    id,
    asset,
    condition,
    targetPriceUsd,
    createdAt: Math.floor(Date.now() / 1000),
  };

  // Forward to CRE HTTP trigger
  const creResponse = await fetch(process.env.CRE_WORKFLOW_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await creResponse.json();
  res.json({ success: true, alert: payload, txHash: result.txHash });
});

app.listen(4021, () => console.log("x402 + CRE server on :4021"));
```

---

## Server: Next.js Route Handler (x402-Gated CRE Trigger)

Next.js uses file-based middleware. The x402 middleware runs at the edge before the route handler.

```bash
npm install x402-next @chainlink/cre-sdk
```

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-next";

export const middleware = paymentMiddleware(
  process.env.WALLET_ADDRESS!,
  {
    "/api/cre/trigger": {
      price: "$0.01",
      network: "base-sepolia",
      config: { description: "Trigger CRE workflow" },
    },
  },
  { url: "https://x402.org/facilitator" }
);

export const config = {
  matcher: ["/api/cre/trigger/:path*"],
};
```

```typescript
// app/api/cre/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const creResponse = await fetch(process.env.CRE_WORKFLOW_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await creResponse.json();
  return NextResponse.json({ success: true, ...result });
}
```

---

## CRE Workflow (Using @chainlink/cre-sdk)

CRE workflows are TypeScript files built with `@chainlink/cre-sdk`. A workflow defines triggers, capabilities, and a handler function.

### Minimal Workflow Skeleton

```typescript
// workflow/main.ts
import { Runner, handler } from "@chainlink/cre-sdk/runner";
import { Runtime, NodeRuntime } from "@chainlink/cre-sdk/runtime";
import { HTTPClient } from "@chainlink/cre-sdk/capabilities/http";
import { EVMClient } from "@chainlink/cre-sdk/capabilities/evm";
import { z } from "zod";

const ConfigSchema = z.object({
  ruleRegistryAddress: z.string(),
  chainSelectorName: z.string().default("ethereum-testnet-sepolia-base-1"),
  gasLimit: z.string().default("1000000"),
  dataFeeds: z.record(z.string()),
});

const workflow = handler({
  config: ConfigSchema,
  triggers: {
    http: { type: "http" },
  },
  capabilities: {
    httpClient: HTTPClient,
    evmClient: EVMClient,
  },
  async run(ctx) {
    const { httpClient, evmClient } = ctx.capabilities;
    const config = ctx.config;

    // Parse incoming alert data from HTTP trigger
    const alertData = ctx.trigger.body;

    // Write alert on-chain via EVM Write capability
    const txHash = await evmClient.write({
      contract: config.ruleRegistryAddress,
      method: "onReport",
      args: [alertData],
      chainSelector: config.chainSelectorName,
      gasLimit: config.gasLimit,
    });

    return { txHash };
  },
});

const runtime = new NodeRuntime();
const runner = new Runner(runtime);
runner.register(workflow);
runner.start();
```

### Zod Config (config.json)

CRE workflows use Zod schemas for typed configuration:

```json
{
  "ruleRegistryAddress": "0x9B9fC1EeF6BFC76CD07501Ae81b66f24fAB322B1",
  "chainSelectorName": "ethereum-testnet-sepolia-base-1",
  "gasLimit": "1000000",
  "dataFeeds": {
    "BTC": "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
    "ETH": "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    "LINK": "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
  }
}
```

### Simulate Locally

```bash
cre workflow simulate --target local-simulation
```

Select the HTTP trigger, paste a JSON payload, and the workflow executes locally with EVM writes broadcast to the testnet.

For the full demo with Cron triggers, price monitoring, and push notifications, see the [x402 + CRE demo repo](https://github.com/smartcontractkit/x402-cre-price-alerts).

---

## Client: Pay for CRE Workflows

Use `wrapFetchWithPayment` from `x402-fetch` to call x402-gated CRE endpoints. The wrapper handles the 402 challenge, signs payment, and retries automatically.

```bash
npm install x402-fetch viem
```

### Single CRE Endpoint

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const paidFetch = wrapFetchWithPayment(wallet);

const response = await paidFetch("https://cre-api.example.com/api/alerts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    asset: "BTC",
    condition: "gt",
    targetPriceUsd: 100000,
  }),
});

const result = await response.json();
console.log(result.txHash);
```

### Sequential: Oracle Price then Settlement

```typescript
const priceRes = await paidFetch("https://oracle.example.com/api/price/BTC");
const { price } = await priceRes.json();

const settleRes = await paidFetch("https://settlement.example.com/api/settle", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ asset: "BTC", price, action: "swap" }),
});

const settlement = await settleRes.json();
console.log("Settled at price:", price, "txHash:", settlement.txHash);
```

---

## Sentinel Payment Router: Multi-CRE Orchestration

Use `PaymentRouter` from `@x402sentinel/router` to orchestrate multiple paid CRE endpoints with budget caps, parallel execution, and unified cryptographic receipts.

```bash
npm install @x402sentinel/router x402-fetch viem
```

### Parallel: Multiple CRE Endpoints

```typescript
import { PaymentRouter } from "@x402sentinel/router";
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const paidFetch = wrapFetchWithPayment(wallet);

const router = new PaymentRouter({
  paymentFetch: paidFetch,
  getPaymentInfo: () => null,
  agentId: "cre-orchestrator",
  apiKey: process.env.SENTINEL_API_KEY,
});

const result = await router.execute({
  name: "cre-data-pipeline",
  maxBudgetUsd: "$0.10",
  strategy: "parallel",
  endpoints: [
    { label: "btc-price",  url: "https://cre-api.example.com/api/price/BTC",  maxUsd: 0.03 },
    { label: "eth-price",  url: "https://cre-api.example.com/api/price/ETH",  maxUsd: 0.03 },
    { label: "cre-verify", url: "https://cre-api.example.com/api/verify",     maxUsd: 0.04 },
  ],
});

console.log(result.success);
console.log(result.totalSpentUsd);
console.log(result.receipt.receiptHash);
console.log(result.receipt.sentinelSig);
```

### Sequential: Dependent CRE Calls

```typescript
const step1 = await router.execute({
  name: "oracle-price",
  maxBudgetUsd: "$0.05",
  strategy: "sequential",
  endpoints: [
    { label: "oracle", url: "https://cre-api.example.com/api/price/BTC", required: true },
  ],
});

const oraclePrice = step1.results.oracle.data.price;

const step2 = await router.execute({
  name: "settlement",
  maxBudgetUsd: "$0.05",
  strategy: "sequential",
  endpoints: [
    {
      label: "settle",
      url: "https://cre-api.example.com/api/settle",
      method: "POST",
      body: { asset: "BTC", price: oraclePrice, action: "swap" },
      required: true,
    },
  ],
});

console.log("Settlement:", step2.results.settle.data);
```

See `references/sentinel-router.md` for the full Router API.

---

## ChaosChain Decentralized Facilitator

[ChaosChain](https://facilitator.chaoscha.in) is a decentralized, BFT-verified payment facilitator for x402. Swap the facilitator URL to use decentralized settlement instead of `x402.org`.

### Configuration

One-line change in your server config:

```typescript
// Express V1 — change the facilitator URL
app.use(
  paymentMiddleware(
    process.env.WALLET_ADDRESS!,
    { "/api/cre/trigger": { price: "$0.01", network: "base-sepolia" } },
    { url: "https://facilitator.chaoscha.in" }
  )
);
```

```typescript
// Next.js V1
export const middleware = paymentMiddleware(
  process.env.WALLET_ADDRESS!,
  { "/api/cre/trigger": { price: "$0.01", network: "base-sepolia" } },
  { url: "https://facilitator.chaoscha.in" }
);
```

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/verify` | POST | Verify payment authorization signature |
| `/settle` | POST | Settle USDC on-chain via EIP-3009 |
| `/supported` | GET | List supported networks and tokens |

### Supported Networks

| Network | Chain ID | Token | Status |
|---------|----------|-------|--------|
| Base Sepolia | `eip155:84532` | USDC | Live |
| Ethereum Sepolia | `eip155:11155111` | USDC | Live |
| Base Mainnet | `eip155:8453` | USDC | Live |
| Ethereum Mainnet | `eip155:1` | USDC | Live |

### Key Details

- **1% flat fee** per settlement
- **No API keys required** — fully permissionless
- **EIP-3009 gasless settlement** — users pay in USDC, no ETH needed for gas
- **BFT consensus** — Byzantine fault-tolerant verification

### Health Check

```bash
curl https://facilitator.chaoscha.in/supported
```

### Optional: Agent Identity with @chaoschain/sdk

```bash
npm install @chaoschain/sdk
```

```typescript
import { ChaosAgent } from "@chaoschain/sdk";

const agent = new ChaosAgent({
  agentId: process.env.CHAOSCHAIN_AGENT_ID,
});
```

`@chaoschain/sdk` provides ERC-8004 agent identity for on-chain attribution. This is optional — ChaosChain works without it.

---

## Environment Variables

```env
# Server
WALLET_ADDRESS=0x...                     # Receiving wallet address
FACILITATOR_URL=https://x402.org/facilitator  # or https://facilitator.chaoscha.in
CRE_WORKFLOW_URL=http://localhost:8080   # CRE workflow HTTP trigger endpoint

# Client
PRIVATE_KEY=0x...                        # Signing wallet private key (NEVER commit)

# CRE
CRE_ETH_PRIVATE_KEY=0x...               # For local simulation EVM writes
CRE_TARGET=staging-settings

# Optional
SENTINEL_API_KEY=sk_...                  # For Sentinel Payment Router receipts
CHAOSCHAIN_AGENT_ID=...                  # For ChaosChain agent identity
```

---

## Reference Links

- [CRE docs](https://docs.chain.link/cre)
- [CRE Capabilities](https://docs.chain.link/cre/capabilities)
- [CRE CLI Installation](https://docs.chain.link/cre/getting-started/cli-installation)
- [CRE Forwarder Addresses](https://docs.chain.link/cre/guides/workflow/using-evm-client/supported-networks-ts)
- [x402 + CRE Demo Repo](https://github.com/smartcontractkit/x402-cre-price-alerts)
- [ChaosChain Facilitator](https://facilitator.chaoscha.in)
- [x402 Facilitator](https://x402.org/facilitator)
