# Paid API Example (Seller)

A Next.js API that charges USDC per request using x402. Two paid endpoints, one free health check.

| Endpoint | Price | What it does |
|----------|-------|-------------|
| GET /api/joke | $0.001 | Random programming joke |
| GET /api/quote | $0.002 | Random motivational quote |
| GET /api/health | Free | Health check |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvaleo-cash%2Fx402-payments-skill%2Ftree%2Fmain%2Fexamples%2Fpaid-api-seller&env=WALLET_ADDRESS&envDescription=Your%20wallet%20address%20to%20receive%20USDC%20payments&project-name=x402-paid-api)

## Run locally

```bash
git clone https://github.com/valeo-cash/x402-payments-skill.git
cd x402-payments-skill/examples/paid-api-seller
cp .env.example .env.local
# Edit .env.local with your wallet address
npm install
npm run dev
```

Open http://localhost:3000

## Test it

```bash
# This will return 402 Payment Required with pricing info
curl http://localhost:3000/api/joke

# Health check (free, no payment needed)
curl http://localhost:3000/api/health
```

## Network

Uses **Base Sepolia** (testnet). Get free testnet USDC from the [Base faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet).

To switch to mainnet, change `base-sepolia` to `base` in middleware.ts.
