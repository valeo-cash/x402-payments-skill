import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "x402 Paid API Demo",
  description: "A Next.js API that charges USDC per request using x402",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0, backgroundColor: "#0a0a0a", color: "#ededed" }}>
        {children}
      </body>
    </html>
  );
}
