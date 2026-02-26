# Sentinel Payment Router Reference

Complete guide to `@x402sentinel/router` — multi-endpoint x402 payment orchestration with budget enforcement and cryptographic receipts.

---

## Why Use the Router

**Without the router** — calling 3 paid endpoints manually:
1. Probe endpoint A for price
2. Check budget
3. Pay endpoint A
4. Parse response
5. Probe endpoint B for price
6. Check remaining budget
7. Pay endpoint B
8. Parse response
9. Probe endpoint C for price
10. Check remaining budget
11. Pay endpoint C
12. Parse response
13. Combine results
14. Generate 3 separate receipts with no connection between them

**With the router** — one call:
1. `router.execute()` — discovery, budget, execution, unified receipt

The router handles: concurrent 402 probing, budget reservation with async mutex, parallel/sequential/best-effort execution, unified SHA-256 receipt generation, and server-side HMAC signing.

---

## Installation

```bash
npm install @x402sentinel/router
```

---

## Quick Start

```typescript
import { PaymentRouter } from "@x402sentinel/router";
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// Set up x402-fetch for payment signing
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const paidFetch = wrapFetchWithPayment(wallet);

// Create router
const router = new PaymentRouter({
  paymentFetch: paidFetch,
  getPaymentInfo: () => null,
  agentId: "research-agent-01",
  apiKey: "sk_...",
});

// Execute a multi-endpoint route
const result = await router.execute({
  name: "research-pipeline",
  maxBudgetUsd: "$0.10",
  strategy: "parallel",
  endpoints: [
    { label: "weather", url: "https://weather.x402.dev/data", maxUsd: 0.05 },
    { label: "market",  url: "https://market.x402.dev/prices", maxUsd: 0.05 },
  ],
});

console.log(result.success);                  // true
console.log(result.totalSpentUsd);            // 0.02
console.log(result.receipt.receiptHash);      // SHA-256
console.log(result.receipt.sentinelSig);      // Server HMAC
console.log(result.results.weather.data);     // Weather response
console.log(result.results.market.data);      // Market response
```

---

## Full API Reference

### `new PaymentRouter(options?)`

```typescript
interface PaymentRouterOptions {
  paymentFetch?: typeof fetch;
  getPaymentInfo?: () => PaymentInfo | null;
  agentId?: string;
  apiKey?: string;
  sentinelUrl?: string;
  timeout?: number;
  parse402?: (response: Response, body: string) => DiscoveredPayment | null;
  resolveToken?: (address: string, network: string) => { symbol: string; decimals: number } | null;
  onPayment?: (result: EndpointResult) => void | Promise<void>;
  onComplete?: (result: RouteExecutionResult) => void | Promise<void>;
  onError?: (label: string, error: Error) => void | Promise<void>;
}
```

| Option | Type | Description |
|--------|------|-------------|
| `paymentFetch` | `typeof fetch` | x402 payment-aware fetch function (e.g. from `x402-fetch`) |
| `getPaymentInfo` | `() => PaymentInfo \| null` | Retrieve payment details after each call |
| `agentId` | `string` | Agent identifier for receipt attribution |
| `apiKey` | `string` | Sentinel API key for server signing |
| `sentinelUrl` | `string` | Sentinel API URL (default: `https://sentinel.valeocash.com`) |
| `timeout` | `number` | Default timeout per endpoint in ms (default: 10000) |
| `parse402` | `function` | Custom 402 response parser for non-standard formats |
| `resolveToken` | `function` | Custom token address resolver |
| `onPayment` | `function` | Callback fired after each endpoint payment |
| `onComplete` | `function` | Callback fired after full execution |
| `onError` | `function` | Callback fired on endpoint error |

### `router.execute(config)`

```typescript
interface RouteConfig {
  name: string;
  description?: string;
  endpoints: RouteEndpoint[];
  maxBudgetUsd: string;
  strategy?: "parallel" | "sequential" | "best-effort";
  mode?: "multiTx" | "singleTx";
  timeout?: number;
  metadata?: Record<string, unknown>;
}

interface RouteEndpoint {
  label: string;
  url: string;
  maxUsd?: number;
  weight?: number;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  required?: boolean;
  timeout?: number;
}
```

Returns `RouteExecutionResult`:

```typescript
interface RouteExecutionResult {
  success: boolean;
  results: Record<string, EndpointResult>;
  resultsList: EndpointResult[];
  receipt: UnifiedReceipt;
  maxBudgetUsd: number;
  totalSpentUsd: number;
  totalTimeMs: number;
  discovery: ProbeResult[];
  routeSnapshot: RouteConfig;
  mode: "multiTx" | "singleTx";
}
```

### `router.discover(config)`

Probes all endpoints without paying. Returns estimated costs and compatibility info.

```typescript
const estimate = await router.discover({
  name: "test",
  maxBudgetUsd: "$0.10",
  endpoints: [
    { label: "api1", url: "https://api1.example.com" },
    { label: "api2", url: "https://api2.example.com" },
  ],
});

console.log(estimate.estimatedTotalUsd);     // Total discovered cost
console.log(estimate.withinTotalBudget);     // true/false
console.log(estimate.singleTxCompatible);    // Can use singleTx mode?
console.log(estimate.perEndpoint);           // Per-endpoint breakdown
```

### `router.register(config)` / `router.unregister(name)`

Pre-register routes for repeated execution:

```typescript
router.register({
  name: "daily-check",
  maxBudgetUsd: "$0.05",
  strategy: "parallel",
  endpoints: [
    { label: "health", url: "https://api.example.com/health" },
    { label: "status", url: "https://api.example.com/status" },
  ],
});

// Execute by name
const result = await router.execute("daily-check");
```

---

## Execution Strategies

### Parallel (default)

All endpoints execute concurrently. Fastest option. Fails if any `required: true` endpoint fails.

```typescript
{ strategy: "parallel" }
```

### Sequential

Endpoints execute in order, sorted by `weight` (descending). Stops if a `required` endpoint fails. Remaining endpoints are marked `"skipped"`.

```typescript
{
  strategy: "sequential",
  endpoints: [
    { label: "primary",   url: "...", weight: 10, required: true },
    { label: "secondary", url: "...", weight: 5,  required: false },
    { label: "optional",  url: "...", weight: 1,  required: false },
  ],
}
```

### Best-Effort

All endpoints execute concurrently. Succeeds if at least one endpoint succeeds. Use for redundancy.

```typescript
{ strategy: "best-effort" }
```

---

## Unified Receipts

Every execution produces a `UnifiedReceipt`:

```typescript
interface UnifiedReceipt {
  id: string;
  routeName: string;
  timestamp: string;
  totalSpent: { amount: string; amountUsd: number; currency: string };
  maxBudgetUsd: number;
  payments: Array<{
    label: string;
    url: string;
    amountRaw: string;
    amountUsd: number;
    currency: string;
    network: string;
    txHash?: string;
    payTo: string;
  }>;
  execution: {
    strategy: string;
    mode: string;
    totalEndpoints: number;
    successfulEndpoints: number;
    failedEndpoints: number;
    totalTimeMs: number;
  };
  agentId: string;
  receiptHash: string;
  sentinelSig?: string;
  subReceiptHashes: string[];
}
```

- **`receiptHash`** — SHA-256 of canonical receipt JSON, computed client-side
- **`sentinelSig`** — HMAC-SHA256 over `receiptHash`, computed server-side (no secrets in client)
- **`subReceiptHashes`** — SHA-256 of each individual sub-payment

### Shareable Proof

```
X-Sentinel-Receipt-Hash: a1b2c3d4e5f6...
```

### Public Verification

```bash
curl -X POST https://sentinel.valeocash.com/api/v1/routes/verify \
  -H "Content-Type: application/json" \
  -d '{"receiptHash": "a1b2c3...", "sentinelSig": "d4e5f6..."}'
```

Response:
```json
{ "verified": true, "routeName": "research-pipeline", "executionId": "rex_..." }
```

---

## Budget Enforcement

Budget is checked in two phases:

1. **Pre-check** — after discovery, the router compares estimated total against `maxBudgetUsd` and logs a warning if over
2. **Hard enforcement** — at payment time, each endpoint reserves budget via an async mutex. If the reservation fails (remaining budget insufficient), the endpoint is marked `"budget-exceeded"` and no payment is attempted

Per-endpoint caps (`maxUsd`) are checked before budget reservation:

```typescript
endpoints: [
  { label: "cheap", url: "...", maxUsd: 0.01 },
  { label: "expensive", url: "...", maxUsd: 0.05 },
]
```

If an endpoint's discovered price exceeds its `maxUsd`, it's blocked before any money moves.

---

## Payment Modes

| Mode | Description |
|------|-------------|
| `multiTx` | Each endpoint gets its own payment. Default. Most compatible. |
| `singleTx` | One transaction pays all endpoints. Requires all endpoints on the same network + token. Experimental. |

```typescript
{ mode: "singleTx" } // Only if all endpoints share network + token
```

---

## Real-World Example

AI agent due-diligence pipeline:

```typescript
const result = await router.execute({
  name: "due-diligence",
  maxBudgetUsd: "$0.25",
  strategy: "sequential",
  metadata: {
    agentId: "compliance-bot",
    taskId: "dd-2026-001",
    requestedBy: "legal@company.com",
  },
  endpoints: [
    { label: "dns",        url: "https://api.example.com/dns?domain=target.com",     weight: 10, required: true },
    { label: "ssl",        url: "https://api.example.com/ssl?domain=target.com",     weight: 8,  required: true },
    { label: "email",      url: "https://api.example.com/email?addr=ceo@target.com", weight: 6,  required: false },
    { label: "whois",      url: "https://api.example.com/whois?domain=target.com",   weight: 4,  required: false },
    { label: "threat",     url: "https://api.example.com/threat?domain=target.com",  weight: 2,  required: false },
  ],
});

if (result.success) {
  console.log("DNS:",   result.results.dns.data);
  console.log("SSL:",   result.results.ssl.data);
  console.log("Email:", result.results.email?.data);
  console.log("Receipt:", result.receipt.receiptHash);
}
```

---

## Environment Variables

```env
PRIVATE_KEY=0x...                 # Signing wallet for x402-fetch
SENTINEL_SIGNING_KEY=...          # HMAC key for receipt signatures (server-side)
```

---

## Dashboard

Manage routes visually at [sentinel.valeocash.com/dashboard/routes](https://sentinel.valeocash.com/dashboard/routes):

- Create routes with a visual builder
- Discover endpoint costs before committing
- View execution history with receipt hashes
- Copy SDK snippets for any route
