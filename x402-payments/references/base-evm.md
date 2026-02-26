# Base / EVM Reference

Complete guide to building x402 payment infrastructure on Base (EVM) with USDC.

---

## Server V1 (Simple)

The fastest way to monetize an API. One middleware, one line of config per route.

### Next.js

```bash
npm install x402-next
```

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-next";

export const middleware = paymentMiddleware(
  process.env.WALLET_ADDRESS!,
  {
    "/api/weather": {
      price: "$0.01",
      network: "base-sepolia",
      config: { description: "Weather data" },
    },
    "/api/summarize": {
      price: "$0.05",
      network: "base-sepolia",
      config: { description: "Text summarization" },
    },
    "/api/translate": {
      price: "$0.03",
      network: "base-sepolia",
      config: { description: "Translation" },
    },
  },
  { url: "https://x402.org/facilitator" }
);

export const config = {
  matcher: ["/api/weather/:path*", "/api/summarize/:path*", "/api/translate/:path*"],
};
```

```typescript
// app/api/weather/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "London";
  return NextResponse.json({
    city,
    temperature: 22,
    conditions: "Partly cloudy",
    timestamp: Date.now(),
  });
}
```

### Express

```bash
npm install x402-express express
```

```typescript
import express from "express";
import { paymentMiddleware } from "x402-express";

const app = express();

app.use(
  paymentMiddleware(
    process.env.WALLET_ADDRESS!,
    {
      "/api/data": {
        price: "$0.01",
        network: "base-sepolia",
        config: { description: "Premium data" },
      },
    },
    { url: "https://x402.org/facilitator" }
  )
);

app.get("/api/data", (req, res) => {
  res.json({ data: "premium content", timestamp: Date.now() });
});

app.listen(3000);
```

---

## Server V2 (Modular)

V2 packages support multi-chain, lifecycle hooks, and modular scheme registration. Use when you need Base + Solana or advanced configuration.

### Next.js V2

```bash
npm install @x402/next @x402/core @x402/evm
```

```typescript
// middleware.ts
import { paymentProxy, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme());

export const middleware = paymentProxy(
  {
    "/api/data": {
      accepts: [
        {
          scheme: "exact",
          price: "$0.01",
          network: "eip155:8453",
          payTo: process.env.WALLET_ADDRESS!,
        },
      ],
      description: "Premium data endpoint",
    },
  },
  server
);

export const config = {
  matcher: ["/api/data/:path*"],
};
```

### Express V2

```bash
npm install @x402/express @x402/core @x402/evm
```

```typescript
import express from "express";
import { paymentProxy, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const app = express();

const facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme());

app.use(
  paymentProxy(
    {
      "/api/data": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:8453",
            payTo: process.env.WALLET_ADDRESS!,
          },
        ],
        description: "Premium data",
      },
    },
    server
  )
);

app.get("/api/data", (req, res) => {
  res.json({ data: "premium content" });
});

app.listen(3000);
```

### Lifecycle Hooks (V2)

```typescript
const server = new x402ResourceServer(facilitator, {
  onBeforeVerify: async (paymentHeader, resource) => {
    console.log("Verifying payment for:", resource);
  },
  onAfterVerify: async (paymentHeader, resource, result) => {
    console.log("Verification result:", result);
  },
  onBeforeSettle: async (paymentHeader, resource) => {
    console.log("Settling payment...");
  },
  onAfterSettle: async (paymentHeader, resource, result) => {
    console.log("Settlement result:", result);
  },
});
```

---

## Client: x402-fetch

Wraps `fetch()` to automatically handle 402 responses. Detects payment requirements, signs the transaction, and retries with the X-PAYMENT header.

### Node.js

```bash
npm install x402-fetch viem
```

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const paidFetch = wrapFetchWithPayment(wallet);

const response = await paidFetch("https://api.example.com/premium");
const data = await response.json();
console.log(data);
```

### Browser

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, custom } from "viem";
import { base } from "viem/chains";

const wallet = createWalletClient({
  chain: base,
  transport: custom(window.ethereum!),
});

const paidFetch = wrapFetchWithPayment(wallet);
const response = await paidFetch("https://api.example.com/premium");
const data = await response.json();
```

### Axios Alternative

```bash
npm install @x402/axios axios viem
```

```typescript
import { wrapAxiosWithPayment } from "@x402/axios";
import axios from "axios";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: base, transport: http() });
const paidAxios = wrapAxiosWithPayment(axios.create(), wallet);

const { data } = await paidAxios.get("https://api.example.com/premium");
```

---

## Environment Variables

```env
# Server
WALLET_ADDRESS=0x...              # Receiving wallet address

# Client
PRIVATE_KEY=0x...                 # Signing wallet private key (NEVER commit)

# Optional: Coinbase CDP facilitator
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

---

## Deploying to Vercel

1. Push your Next.js project to GitHub
2. Connect the repo to Vercel
3. Add environment variables: `WALLET_ADDRESS` (and `CDP_*` if using Coinbase facilitator)
4. Deploy

The middleware runs at the edge with zero cold start. Any route matched by the middleware matcher will require payment.

---

## Network Reference

| Network | V1 string | V2 CAIP-2 | USDC Contract |
|---------|-----------|-----------|---------------|
| Base Mainnet | `"base"` | `"eip155:8453"` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | `"base-sepolia"` | `"eip155:84532"` | Testnet USDC |
| Ethereum | `"ethereum"` | `"eip155:1"` | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Polygon | — | `"eip155:137"` | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Arbitrum | — | `"eip155:42161"` | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

Always start on `base-sepolia` for development, then switch to `base` for production.
