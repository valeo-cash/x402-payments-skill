import { paymentMiddleware } from "x402-next";

export const middleware = paymentMiddleware(
  process.env.WALLET_ADDRESS!,
  {
    "/api/joke": {
      price: "$0.001",
      network: "base-sepolia",
      config: { description: "Random programming joke" },
    },
    "/api/quote": {
      price: "$0.002",
      network: "base-sepolia",
      config: { description: "Random motivational quote" },
    },
  },
  { url: "https://x402.org/facilitator" }
);

export const config = {
  matcher: ["/api/joke/:path*", "/api/quote/:path*"],
};
