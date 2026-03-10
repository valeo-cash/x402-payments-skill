# Stellar Reference

Complete guide to building x402 payment infrastructure on Stellar with Soroban smart contracts and USDC (SEP-41).

---

## Overview

Stellar x402 uses **Soroban authorization entries** instead of full transactions: clients sign auth entries with `max_ledger` bounds and a random nonce for replay protection. This is lighter and faster than Solana's transaction-signing approach. The **"Built on Stellar x402 Facilitator"** (OpenZeppelin Relayer + Facilitator Plugin) handles verification, settlement, and **covers all network fees** — transactions are completely fee-free for clients; no XLM is required. The entire x402 cycle (request → 402 → payment → resource delivered) completes in **under 5 seconds**. Tokens follow **SEP-41** (classic Stellar assets and Soroban contract tokens); USDC, PYUSD, and USDY are natively supported. The facilitator is **non-custodial**: the agent controls what gets paid, the facilitator handles how it settles.

---

## Facilitator

The **Built on Stellar x402 Facilitator** is powered by OpenZeppelin's Relayer framework and their open-source Facilitator Plugin. It is Stellar-specific, non-custodial, abstracts blockchain complexity (fees, tx submission, network selection), and sponsors all fees.

| | Value |
|---|--------|
| **Testnet URL** | `https://channels.openzeppelin.com/x402/testnet` |
| **Mainnet** | Coming soon |
| **API key generation** | [https://channels.openzeppelin.com/testnet/gen](https://channels.openzeppelin.com/testnet/gen) |

- **Plugin repo:** [github.com/OpenZeppelin/relayer-plugin-x402-facilitator](https://github.com/OpenZeppelin/relayer-plugin-x402-facilitator)
- **Plugin docs:** [docs.openzeppelin.com/relayer/guides/stellar-x402-facilitator-guide](https://docs.openzeppelin.com/relayer/guides/stellar-x402-facilitator-guide)
- **Relayer SDK:** [github.com/OpenZeppelin/openzeppelin-relayer-sdk](https://github.com/OpenZeppelin/openzeppelin-relayer-sdk)

---

## Server Setup

### Pattern 1: Express (Stellar-only, canonical)

Simplest Stellar-only setup using `paymentMiddleware` from `@x402/express` with the OZ Channels facilitator.

```bash
npm install @x402/express @x402/core express
```

```typescript
import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "stellar:testnet",
            payTo: process.env.STELLAR_PAY_TO_ADDRESS!,
          },
        ],
        description: "Weather report",
      },
    },
    {
      url: "https://channels.openzeppelin.com/x402/testnet",
      headers: process.env.OZ_RELAYER_API_KEY
        ? { "x-api-key": process.env.OZ_RELAYER_API_KEY }
        : undefined,
    }
  )
);

app.get("/weather", (_req, res) => {
  res.json({
    city: "London",
    temperature: 22,
    conditions: "Partly cloudy",
    timestamp: Date.now(),
  });
});

app.listen(3000);
```

Use `stellar:pubnet` and your mainnet address when mainnet is available. Replace `STELLAR_PAY_TO_ADDRESS` with your Stellar public key (e.g. `G...`).

### Pattern 2: Next.js with V2 paymentProxy (Stellar)

Use V2 `paymentProxy` with the OZ Channels facilitator for Stellar-only or Stellar-included routes.

```bash
npm install @x402/next @x402/core
```

```typescript
// middleware.ts
import { paymentProxy, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";

const stellarFacilitator = new HTTPFacilitatorClient({
  url: "https://channels.openzeppelin.com/x402/testnet",
  headers: process.env.OZ_RELAYER_API_KEY
    ? { "x-api-key": process.env.OZ_RELAYER_API_KEY }
    : undefined,
});

const server = new x402ResourceServer(stellarFacilitator);

export const middleware = paymentProxy(
  {
    "/api/weather": {
      accepts: [
        {
          scheme: "exact",
          price: "$0.001",
          network: "stellar:testnet",
          payTo: process.env.STELLAR_PAY_TO_ADDRESS!,
        },
      ],
      description: "Weather report",
    },
  },
  server
);

export const config = {
  matcher: ["/api/weather/:path*"],
};
```

### Pattern 3: Multi-chain (Stellar + Base + Solana)

Stellar uses a **different facilitator** (OZ Channels) than Base/Solana (x402.org). Configure both: one resource server or routing per facilitator.

```bash
npm install @x402/next @x402/core @x402/evm @x402/svm
```

```typescript
// middleware.ts
import { paymentProxy, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";

const x402Facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const stellarFacilitator = new HTTPFacilitatorClient({
  url: "https://channels.openzeppelin.com/x402/testnet",
  headers: process.env.OZ_RELAYER_API_KEY
    ? { "x-api-key": process.env.OZ_RELAYER_API_KEY }
    : undefined,
});

const server = new x402ResourceServer(x402Facilitator)
  .register("eip155:8453", new ExactEvmScheme())
  .register("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", new ExactSvmScheme());

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
        {
          scheme: "exact",
          price: "$0.01",
          network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          payTo: process.env.SOLANA_WALLET_ADDRESS!,
        },
        {
          scheme: "exact",
          price: "$0.01",
          network: "stellar:testnet",
          payTo: process.env.STELLAR_PAY_TO_ADDRESS!,
        },
      ],
      description: "Multi-chain premium data",
    },
  },
  server
);

export const config = {
  matcher: ["/api/data/:path*"],
};
```

Note: Base and Solana use x402.org; Stellar uses OZ Channels. For production tri-chain setups, ensure Stellar routes use the Stellar facilitator client and that the resource server or proxy is wired to the correct facilitator per chain.

---

## Client: Browser with Freighter

Use the Freighter browser extension and `signAuthEntry` for Soroban auth-entry signing. Freighter is the primary wallet for x402 on Stellar; Freighter Mobile does not support x402 yet.

```bash
npm install @stellar/freighter-api @stellar/stellar-sdk
```

```tsx
import { useState } from "react";
import { isConnected, getPublicKey, signAuthEntry } from "@stellar/freighter-api";

export function PaidWeatherButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPaidWeather() {
    setLoading(true);
    setError(null);
    const apiUrl = "https://api.example.com/weather";

    try {
      const connected = await isConnected();
      if (!connected) {
        setError("Connect Freighter first");
        return;
      }

      let res = await fetch(apiUrl);

      if (res.status === 402) {
        const paymentRequired = res.headers.get("payment-required");
        if (!paymentRequired) {
          setError("402 but no payment-required header");
          return;
        }

        const options = JSON.parse(paymentRequired);
        const stellarOption = options.accepts?.find(
          (a: { network?: string }) => a.network?.startsWith("stellar:")
        );
        if (!stellarOption) {
          setError("No Stellar payment option");
          return;
        }

        const authEntryBase64 = stellarOption.authEntry;
        if (!authEntryBase64) {
          setError("Missing auth entry in 402");
          return;
        }

        const pubKey = await getPublicKey();
        if (!pubKey) {
          setError("No public key from Freighter");
          return;
        }

        const signed = await signAuthEntry(authEntryBase64);
        if (!signed) {
          setError("User rejected or signAuthEntry failed");
          return;
        }

        res = await fetch(apiUrl, {
          headers: {
            "payment-signature": signed,
            "x-payment-address": pubKey,
          },
        });
      }

      if (!res.ok) {
        setError(`Request failed: ${res.status}`);
        return;
      }

      const data = await res.json();
      console.log(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={fetchPaidWeather} disabled={loading}>
        {loading ? "Loading…" : "Get weather ($0.001)"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

---

## Client: Node.js (Agents / Scripts)

For AI agents and backend scripts using a Stellar keypair. Same 402 flow: request → 402 → parse payment-required → sign auth entry → retry with payment-signature.

```bash
npm install @stellar/stellar-sdk
```

```typescript
import { Keypair } from "@stellar/stellar-sdk";
import fetch from "node-fetch";

const keypair = Keypair.fromSecret(process.env.STELLAR_SECRET_KEY!);

async function paidFetch(url: string): Promise<Response> {
  const res = await fetch(url);
  if (res.status !== 402) return res as unknown as Response;

  const paymentRequired = res.headers.get("payment-required");
  if (!paymentRequired) throw new Error("402 but no payment-required header");

  const options = JSON.parse(paymentRequired);
  const stellarOption = options.accepts?.find(
    (a: { network?: string }) => a.network?.startsWith("stellar:")
  );
  if (!stellarOption?.authEntry) throw new Error("No Stellar auth entry");

  const authEntryBytes = Buffer.from(stellarOption.authEntry, "base64");
  const signature = keypair.sign(authEntryBytes);
  const signatureBase64 = signature.toString("base64");

  return fetch(url, {
    headers: {
      "payment-signature": signatureBase64,
      "x-payment-address": keypair.publicKey(),
    },
  }) as unknown as Promise<Response>;
}

async function main() {
  const res = await paidFetch("https://api.example.com/weather");
  const data = await res.json();
  console.log(data);
}

main().catch(console.error);
```

---

## Smart Wallets for Agents

OpenZeppelin **smart account contracts** on Stellar support spending limits, multisig thresholds, and scoped permissions for x402 resources. This is the budget/guardrail layer for autonomous agents: enterprises can set limits without removing agent autonomy. Combined with wallet providers like **Crossmint**, you can use embedded agent wallets that respect these policies.

- **Smart account docs:** [docs.openzeppelin.com/stellar-contracts/accounts/smart-account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)

---

## x402-flash

For sub-100ms micropayments, use payment channels via **x402-flash-stellar-sdk** (npm: `x402-flash-stellar-sdk`). Flash channels reduce latency by settling off a pre-funded channel instead of on-chain auth every time.

```bash
npm install x402-flash-stellar-sdk
```

See the package docs and Stellar x402 resources for channel setup and integration.

---

## Stratum Integration (Valeo)

Register the Stellar facilitator with Stratum at `gateway.stratumx402.com` for cross-chain settlement. POST to `/api/facilitators/register` with `chain: "stellar"` and your facilitator details so the gateway can route Stellar x402 payments.

```typescript
await fetch("https://gateway.stratumx402.com/api/facilitators/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chain: "stellar",
    url: "https://channels.openzeppelin.com/x402/testnet",
    apiKey: process.env.OZ_RELAYER_API_KEY,
  }),
});
```

---

## Environment Variables

```env
# Server (Stellar)
STELLAR_PAY_TO_ADDRESS=G...          # Receiving Stellar public key
OZ_RELAYER_API_KEY=...              # Optional; from https://channels.openzeppelin.com/testnet/gen

# Client (Agent)
STELLAR_SECRET_KEY=S...             # Signing secret key (NEVER commit)
```

---

## Network Reference

| Network | CAIP-2 | Facilitator URL | Tokens |
|---------|--------|-----------------|--------|
| Stellar Testnet | `stellar:testnet` | `https://channels.openzeppelin.com/x402/testnet` | Testnet USDC |
| Stellar Mainnet | `stellar:pubnet` | Coming soon | USDC, PYUSD, USDY (SEP-41) |

---

## Resources

- **Stellar x402 Demo:** [stellar.org/x402-demo](https://stellar.org/x402-demo)
- **Developer Docs:** [developers.stellar.org/docs/build/apps/x402](https://developers.stellar.org/docs/build/apps/x402)
- **OZ Facilitator Plugin:** [github.com/OpenZeppelin/relayer-plugin-x402-facilitator](https://github.com/OpenZeppelin/relayer-plugin-x402-facilitator)
- **OZ Facilitator Guide:** [docs.openzeppelin.com/relayer/guides/stellar-x402-facilitator-guide](https://docs.openzeppelin.com/relayer/guides/stellar-x402-facilitator-guide)
- **OZ Relayer SDK:** [github.com/OpenZeppelin/openzeppelin-relayer-sdk](https://github.com/OpenZeppelin/openzeppelin-relayer-sdk)
- **OZ Smart Accounts (Stellar):** [docs.openzeppelin.com/stellar-contracts/accounts/smart-account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)
- **Stellar x402 repo:** [github.com/stellar/x402-stellar](https://github.com/stellar/x402-stellar)
- **x402 protocol:** [x402.org](https://x402.org)
- **Discord:** #x402 on Stellar Discord
