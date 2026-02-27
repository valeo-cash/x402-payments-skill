# Chainlink CRE Reference

Complete guide to integrating x402 payments with Chainlink CRE (Chainlink Runtime Environment) for monetized on-chain/off-chain workflows.

---

## What is CRE

Chainlink Runtime Environment is a decentralized execution layer for building workflows that combine on-chain and off-chain operations. Workflows execute off-chain but write results on-chain via Chainlink's decentralized oracle network.

CRE combines several capabilities:

- **EVM Read/Write** — read contract state, write transaction results on-chain
- **HTTP Requests** — call external APIs and services
- **Chainlink Price Feeds** — access reliable on-chain price data (BTC, ETH, LINK, etc.)
- **Cron Triggers** — schedule recurring workflow executions
- **Push Notifications** — alert users when conditions are met

**x402 is the first AI payments partner for CRE.** Agents can discover, trigger, and pay for CRE workflows using x402 micropayments.

---

## Architecture

```
Agent/User → x402 Payment → Express Server → CRE HTTP Trigger → On-chain Write
                                                    ↓
                                              CRE Cron Trigger → Read on-chain → Notify user
```

Two trigger types work together:

| Trigger | When it fires | What it does |
|---------|--------------|--------------|
| **HTTP Trigger** | x402-paid request hits the server | Writes data on-chain (e.g., store a price alert rule) |
| **Cron Trigger** | Scheduled interval (e.g., hourly) | Reads on-chain state, checks conditions, sends notifications |

The x402 server-side setup is identical to a standard Express server from `references/base-evm.md`. The CRE part is what happens **after** payment is verified.

---

## Server Setup (x402 + CRE)

The server is a standard Express app with `x402-express` middleware. Two endpoints:

- `POST /chat` — free, uses an LLM to parse natural language into structured alert parameters
- `POST /alerts` — paid ($0.01 USDC), creates the alert and triggers the CRE workflow

```bash
npm install express x402-express x402-fetch ethers
```

```typescript
import express from "express";
import { paymentMiddleware } from "x402-express";

const app = express();
app.use(express.json());

// Free endpoint — AI/NLP interprets user request, extracts structured data
app.post("/chat", async (req, res) => {
  // Use any LLM (Gemini, OpenAI, Claude) to parse natural language
  // Extract structured parameters via function calling:
  //   { asset: "BTC", condition: "gt", targetPriceUsd: 60000 }
  // Then call the paid /alerts endpoint internally with x402 payment
  const alertData = await parseWithLLM(req.body.message);
  const response = await x402Client(`http://localhost:${PORT}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(alertData),
  });
  res.json(await response.json());
});

// Paid endpoint — x402 payment required, triggers CRE workflow
app.post("/alerts", async (req, res) => {
  const { asset, condition, targetPriceUsd } = req.body;

  // 1. Create deterministic ID (SHA256 hash of params)
  const id = createHash("sha256")
    .update(`${asset}-${condition}-${targetPriceUsd}`)
    .digest("hex");

  // 2. Build CRE workflow payload
  const payload = { id, asset, condition, targetPriceUsd, createdAt: Math.floor(Date.now() / 1000) };

  // 3. In production: trigger CRE HTTP workflow directly
  // 4. Return confirmation to caller
  console.log("CRE Workflow Payload:", JSON.stringify(payload));
  res.json({ success: true, alert: payload });
});

// x402 middleware protects /alerts
app.use(
  paymentMiddleware(
    process.env.X402_RECEIVER_ADDRESS!,
    { "/alerts": { price: "$0.01", network: "base-sepolia" } },
    { url: process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator" }
  )
);

app.listen(3000);
```

### x402 Client for Internal Payment Calls

The `/chat` endpoint calls `/alerts` internally. Use `x402-fetch` to handle the 402 payment automatically:

```typescript
import { wrapFetchWithPayment as x402Fetch } from "x402-fetch";
import { Wallet } from "ethers";

const wallet = new Wallet(process.env.AGENT_WALLET_PRIVATE_KEY!);

// x402Fetch automatically handles 402 → pay → retry
const response = await x402Fetch(
  `http://localhost:${PORT}/alerts`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(alertData),
  },
  wallet
);
```

---

## CRE Workflow Structure

CRE workflows are TypeScript files with two callback handlers.

### httpCallback.ts

Receives alert data from the x402-gated server and writes it on-chain:

```typescript
// Simplified — receives alert, encodes for on-chain storage, writes via CRE
export async function httpCallback(request: Request): Promise<string> {
  // 1. Parse alert data from request body
  const { id, asset, condition, targetPriceUsd, createdAt } = await request.json();

  // 2. ABI-encode data for on-chain storage
  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },   // id
      { type: "string" },    // asset
      { type: "string" },    // condition
      { type: "uint256" },   // targetPriceUsd
      { type: "uint256" },   // createdAt
    ],
    [id, asset, condition, BigInt(targetPriceUsd), BigInt(createdAt)]
  );

  // 3. Generate CRE report
  const report = runtime.generateReport(encoded);

  // 4. Write to RuleRegistry contract via EVM Write capability
  const txHash = await runtime.evmWrite({
    contract: config.ruleRegistryAddress,
    method: "onReport",
    args: [report],
    chainSelector: config.chainSelectorName,
    gasLimit: config.gasLimit,
  });

  return txHash;
}
```

### cronCallback.ts

Runs on schedule, checks price conditions, and sends notifications:

```typescript
// Simplified — reads rules, checks prices, sends notifications
export async function cronCallback(): Promise<string> {
  // 1. Fetch current prices from Chainlink price feeds
  const prices = await fetchPrices(config.dataFeeds); // { BTC: 90855.76, ETH: 3253.52, LINK: 13.76 }

  // 2. Read all rules from RuleRegistry contract on-chain
  const rules = await runtime.evmRead({
    contract: config.ruleRegistryAddress,
    method: "getAllRules",
    chainSelector: config.chainSelectorName,
  });

  // 3. Check each rule's condition
  let notificationsSent = 0;
  for (const rule of rules) {
    const currentPrice = prices[rule.asset];
    const conditionMet = checkCondition(currentPrice, rule.condition, rule.targetPriceUsd);

    if (conditionMet) {
      // 4. Send push notification via Pushover
      await sendPushNotification({
        title: `${rule.asset} Alert`,
        message: `${rule.asset} $${currentPrice} ${rule.condition} $${rule.targetPriceUsd}`,
      });
      notificationsSent++;
    }
  }

  return `Processed ${rules.length} rules, sent ${notificationsSent} notifications`;
}
```

### config.staging.json

```json
{
  "schedule": "0 0 * * * *",
  "ruleTTL": 1800,
  "evms": [
    {
      "ruleRegistryAddress": "0xYourDeployedContract",
      "chainSelectorName": "ethereum-testnet-sepolia-base-1",
      "gasLimit": "1000000",
      "dataFeeds": {
        "BTC": "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
        "ETH": "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
        "LINK": "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
      }
    }
  ]
}
```

---

## Smart Contract (RuleRegistry)

The on-chain contract stores rules and receives CRE reports.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IReceiverTemplate.sol";
import "./interfaces/IERC20.sol";

contract RuleRegistry is IReceiverTemplate {
    struct Rule {
        bytes32 id;
        string asset;
        string condition;
        uint256 targetPriceUsd;
        uint256 createdAt;
    }

    address public owner;
    address public chainlinkForwarder;
    IERC20 public usdc;
    mapping(bytes32 => Rule) public rules;
    bytes32[] public ruleIds;

    constructor(address _usdc, address _forwarder) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
        chainlinkForwarder = _forwarder;
    }

    // Only callable by CRE forwarder
    function onReport(bytes calldata report) external override {
        require(msg.sender == chainlinkForwarder, "Only CRE forwarder");
        (bytes32 id, string memory asset, string memory condition,
         uint256 targetPriceUsd, uint256 createdAt) =
            abi.decode(report, (bytes32, string, string, uint256, uint256));

        rules[id] = Rule(id, asset, condition, targetPriceUsd, createdAt);
        ruleIds.push(id);
    }

    function getUSDCBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function withdrawUSDC(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        usdc.transfer(to, amount);
    }
}
```

### Constructor Parameters (Base Sepolia)

| Parameter | Address | Description |
|-----------|---------|-------------|
| `_usdc` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | USDC on Base Sepolia |
| `_forwarder` | `0x82300bd7c3958625581cc2f77bc6464dcecdf3e5` | Chainlink CRE Simulation Forwarder |

Deploy via [Remix IDE](https://remix.ethereum.org) or Foundry. Set `X402_RECEIVER_ADDRESS` to the deployed contract address to receive x402 payments directly in the contract.

---

## CRE CLI Commands

The CRE CLI is required for simulating and deploying workflows.

```bash
# Simulate HTTP trigger (writes alert on-chain)
cd cre
cre workflow simulate alerts --env ../.env --broadcast
# Select "HTTP trigger", paste JSON payload from server output

# Simulate Cron trigger (checks prices, sends notifications)
cre workflow simulate alerts --env ../.env
# Select "Cron trigger"
```

---

## Prerequisites & Dependencies

### Required Software

- **Node.js** v18+ and npm
- **Bun** — required for CRE post-install scripts. [Install](https://bun.sh)
- **CRE CLI** — simulate and deploy workflows. [Install](https://docs.chain.link/cre/getting-started/cli-installation)

### Server Dependencies

```bash
npm install express x402-express x402-fetch ethers
```

### Testnet Setup

1. **Base Sepolia ETH**: [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
2. **Base Sepolia USDC**: [Circle Faucet](https://faucet.circle.com/)
3. **Deploy RuleRegistry**: Via Remix or Foundry with constructor params above

---

## Use Cases

| Use Case | x402 Role | CRE Role |
|----------|-----------|----------|
| **Price alerts** | Agent pays to create alert | CRE monitors prices, notifies user |
| **Programmatic payouts** | Payment triggers workflow | CRE confirms data, executes payout |
| **Monetized workflows** | Developers charge per-use | CRE executes decentralized computation |
| **On-chain automation** | Payment triggers on-chain write | CRE writes via EVM Write capability |

---

## Chainlink Data Feed Addresses (Base Sepolia)

| Asset | Address |
|-------|---------|
| BTC | `0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298` |
| ETH | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` |
| LINK | `0xb113F5A928BCfF189C998ab20d753a47F9dE5A61` |

For mainnet and other testnets: [Chainlink Price Feed Addresses](https://docs.chain.link/data-feeds/price-feeds/addresses)

---

## Environment Variables

```env
# Server
PORT=3000
X402_RECEIVER_ADDRESS=0x...              # Receiving address or deployed RuleRegistry contract
X402_FACILITATOR_URL=https://x402.org/facilitator
GEMINI_API_KEY=...                       # or OPENAI_API_KEY — any LLM for /chat parsing
AGENT_WALLET_PRIVATE_KEY=0x...           # Wallet with USDC on Base Sepolia (NEVER commit)

# CRE
CRE_ETH_PRIVATE_KEY=0x...               # For local simulation EVM writes
CRE_TARGET=staging-settings
PUSHOVER_USER_KEY_VAR=...               # Pushover user key (for push notifications)
PUSHOVER_API_KEY_VAR=...                # Pushover API token
```

---

## Reference Links

- [Chainlink CRE Docs](https://docs.chain.link/cre)
- [CRE Capabilities](https://docs.chain.link/cre/capabilities)
- [x402 + CRE Demo Repo](https://github.com/smartcontractkit/x402-cre-price-alerts)
- [CRE CLI Installation](https://docs.chain.link/cre/getting-started/cli-installation)
- [CRE Forwarder Addresses](https://docs.chain.link/cre/guides/workflow/using-evm-client/supported-networks-ts)
- [x402 Facilitator](https://x402.org/facilitator)
