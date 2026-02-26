import { PaymentRouter } from "@x402sentinel/router";
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const x402Fetch = wrapFetchWithPayment(wallet);

const API_URL = process.env.API_URL || "http://localhost:3000";

const router = new PaymentRouter({
  paymentFetch: x402Fetch,
  getPaymentInfo: () => x402Fetch.getLastPayment?.() ?? null,
  agentId: "demo-buyer-agent",
});

console.log("Calling 2 paid endpoints with Sentinel Router...\n");

const result = await router.execute({
  name: "demo-pipeline",
  maxBudgetUsd: "0.01",
  strategy: "parallel",
  endpoints: [
    { label: "joke", url: `${API_URL}/api/joke` },
    { label: "quote", url: `${API_URL}/api/quote` },
  ],
});

console.log("Results:", JSON.stringify(result.results, null, 2));
console.log("\nReceipt:", JSON.stringify(result.receipt, null, 2));
console.log(`\nTotal spent: $${result.totalSpentUsd} USDC`);
console.log("Budget enforced. Unified receipt generated.");
