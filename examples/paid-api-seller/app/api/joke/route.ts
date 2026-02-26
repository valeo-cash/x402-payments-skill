import { NextResponse } from "next/server";

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "There are only 10 types of people — those who understand binary and those who don't.",
  "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?'",
  "Why did the developer go broke? Because he used up all his cache.",
  "!false — it's funny because it's true.",
];

export async function GET() {
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  return NextResponse.json({
    joke,
    paidWith: "USDC via x402",
    timestamp: new Date().toISOString(),
  });
}
