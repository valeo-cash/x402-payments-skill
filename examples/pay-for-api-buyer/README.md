# Pay for API Example (Buyer)

Node.js scripts that pay for x402-protected endpoints. Includes both single-endpoint and Sentinel Router multi-endpoint examples.

## Setup

```bash
cd examples/pay-for-api-buyer
cp .env.example .env
# Edit .env with your private key (Base Sepolia testnet wallet)
npm install
```

## Pay for a single endpoint

```bash
npm run single
```

Calls `/api/joke`, automatically handles the 402 payment flow, prints the joke.

## Pay for multiple endpoints with Sentinel Router

```bash
npm run router
```

Calls both `/api/joke` and `/api/quote` in parallel with:
- Budget cap ($0.01)
- Unified cryptographic receipt
- All payments linked in one hash

## Prerequisites

- Node.js >= 18
- A wallet with testnet USDC on Base Sepolia
- The seller API running (see ../paid-api-seller)
