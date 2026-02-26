import { NextResponse } from "next/server";

const quotes = [
  "The best way to predict the future is to invent it. — Alan Kay",
  "Talk is cheap. Show me the code. — Linus Torvalds",
  "First, solve the problem. Then, write the code. — John Johnson",
  "Simplicity is the soul of efficiency. — Austin Freeman",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler",
];

export async function GET() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  return NextResponse.json({
    quote,
    paidWith: "USDC via x402",
    timestamp: new Date().toISOString(),
  });
}
