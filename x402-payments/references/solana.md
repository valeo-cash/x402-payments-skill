# Solana Reference

Complete guide to building x402 payment infrastructure on Solana with SPL USDC.

---

## Overview

The `x402-solana` package provides both client and server support for the x402 v2 protocol on Solana. It uses CAIP-2 network identifiers, Zod validation, and supports any wallet provider (Phantom, Solflare, Privy, or raw Keypair).

---

## Server Setup

### Next.js API Route

```bash
npm install x402-solana
```

```typescript
// app/api/premium/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createX402Server } from "x402-solana/server";

const x402 = createX402Server({
  facilitatorUrl: "https://x402.org/facilitator",
  payTo: process.env.SOLANA_WALLET_ADDRESS!,
  network: "solana-devnet",
  price: 10000, // 0.01 USDC (6 decimals)
});

export async function GET(request: NextRequest) {
  const paymentHeader = request.headers.get("x-payment");

  if (!paymentHeader) {
    return NextResponse.json(
      x402.getPaymentRequirements(),
      { status: 402 }
    );
  }

  const verification = await x402.verifyPayment(paymentHeader);
  if (!verification.valid) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 402 }
    );
  }

  return NextResponse.json({
    data: "Premium Solana content",
    timestamp: Date.now(),
  });
}
```

### Express

```typescript
import express from "express";
import { createX402Server } from "x402-solana/server";

const app = express();

const x402 = createX402Server({
  facilitatorUrl: "https://x402.org/facilitator",
  payTo: process.env.SOLANA_WALLET_ADDRESS!,
  network: "solana-devnet",
  price: 10000,
});

app.get("/api/premium", async (req, res) => {
  const paymentHeader = req.headers["x-payment"] as string;

  if (!paymentHeader) {
    return res.status(402).json(x402.getPaymentRequirements());
  }

  const verification = await x402.verifyPayment(paymentHeader);
  if (!verification.valid) {
    return res.status(402).json({ error: "Payment verification failed" });
  }

  res.json({ data: "Premium content", timestamp: Date.now() });
});

app.listen(3000);
```

### V2 Modular (Multi-chain with Base)

```bash
npm install @x402/next @x402/core @x402/evm @x402/svm
```

```typescript
// middleware.ts
import { paymentProxy, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";

const facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitator)
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

---

## Client: Browser with Wallet Adapter

Standard React setup using `@solana/wallet-adapter-react`.

```bash
npm install x402-solana @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-react-ui
```

```tsx
// providers.tsx
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

const wallets = [new PhantomWalletAdapter()];
const endpoint = clusterApiUrl("devnet");

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

```tsx
// components/PaidApiButton.tsx
import { useWallet } from "@solana/wallet-adapter-react";
import { createX402Client } from "x402-solana";

export function PaidApiButton() {
  const { publicKey, signTransaction } = useWallet();

  async function callPaidApi() {
    if (!publicKey || !signTransaction) return;

    const client = createX402Client({
      walletAddress: publicKey.toBase58(),
      signTransaction: async (tx) => {
        const signed = await signTransaction(tx);
        return signed;
      },
    });

    const response = await client.fetch("https://api.example.com/premium");
    const data = await response.json();
    console.log(data);
  }

  return <button onClick={callPaidApi}>Call Paid API ($0.01)</button>;
}
```

---

## Client: Browser with Privy

```bash
npm install x402-solana @privy-io/react-auth
```

```tsx
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import { createX402Client } from "x402-solana";

export function PaidApiWithPrivy() {
  const { authenticated } = usePrivy();
  const { wallets } = useSolanaWallets();

  async function callPaidApi() {
    const wallet = wallets[0];
    if (!wallet) return;

    const client = createX402Client({
      walletAddress: wallet.address,
      signTransaction: async (tx) => {
        const signed = await wallet.signTransaction(tx);
        return signed;
      },
    });

    const response = await client.fetch("https://api.example.com/premium");
    const data = await response.json();
    console.log(data);
  }

  if (!authenticated) return <p>Please log in</p>;
  return <button onClick={callPaidApi}>Call Paid API</button>;
}
```

---

## Client: Node.js (Agents / Scripts)

For AI agents and backend scripts that make autonomous payments.

```bash
npm install x402-solana @solana/web3.js bs58
```

```typescript
import { createX402Client } from "x402-solana";
import { Keypair, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

const keypair = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY!)
);

const client = createX402Client({
  walletAddress: keypair.publicKey.toBase58(),
  signTransaction: async (tx: Transaction) => {
    tx.sign(keypair);
    return tx;
  },
});

const response = await client.fetch("https://api.example.com/premium");
const data = await response.json();
console.log(data);
```

---

## Environment Variables

```env
# Server
SOLANA_WALLET_ADDRESS=...         # Receiving wallet (base58)

# Client
SOLANA_PRIVATE_KEY=...            # Signing wallet (base58, NEVER commit)
```

---

## Network Reference

| Network | Short string | CAIP-2 | USDC Mint |
|---------|-------------|--------|-----------|
| Solana Mainnet | `"solana-mainnet"` | `"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Solana Devnet | `"solana-devnet"` | `"solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"` | Devnet USDC |

Always start on `solana-devnet` for development. Switch to `solana-mainnet` for production by changing the network string and using real USDC.
