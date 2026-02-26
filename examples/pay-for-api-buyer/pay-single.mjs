import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const paidFetch = wrapFetchWithPayment(wallet);

const API_URL = process.env.API_URL || "http://localhost:3000";

console.log("Calling paid joke API...\n");

const response = await paidFetch(`${API_URL}/api/joke`);
const data = await response.json();

console.log("Response:", JSON.stringify(data, null, 2));
console.log("\nPaid with USDC on Base Sepolia!");
