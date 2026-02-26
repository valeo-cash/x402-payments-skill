export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>x402 Paid API Demo</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        This API charges USDC per request using the{" "}
        <a href="https://x402.org" style={{ color: "#3b82f6" }}>x402 protocol</a>.
        No API keys. No subscriptions. Pay per call.
      </p>

      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Endpoints</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: "0.75rem 0" }}>Endpoint</th>
            <th style={{ textAlign: "left", padding: "0.75rem 0" }}>Price</th>
            <th style={{ textAlign: "left", padding: "0.75rem 0" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #222" }}>
            <td style={{ padding: "0.75rem 0" }}>
              <code style={{ backgroundColor: "#1a1a1a", padding: "0.25rem 0.5rem", borderRadius: 4 }}>
                GET /api/joke
              </code>
            </td>
            <td style={{ padding: "0.75rem 0" }}>$0.001</td>
            <td style={{ padding: "0.75rem 0", color: "#888" }}>Random programming joke</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #222" }}>
            <td style={{ padding: "0.75rem 0" }}>
              <code style={{ backgroundColor: "#1a1a1a", padding: "0.25rem 0.5rem", borderRadius: 4 }}>
                GET /api/quote
              </code>
            </td>
            <td style={{ padding: "0.75rem 0" }}>$0.002</td>
            <td style={{ padding: "0.75rem 0", color: "#888" }}>Random motivational quote</td>
          </tr>
          <tr>
            <td style={{ padding: "0.75rem 0" }}>
              <code style={{ backgroundColor: "#1a1a1a", padding: "0.25rem 0.5rem", borderRadius: 4 }}>
                GET /api/health
              </code>
            </td>
            <td style={{ padding: "0.75rem 0" }}>Free</td>
            <td style={{ padding: "0.75rem 0", color: "#888" }}>Health check</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>How it works</h2>
      <ol style={{ color: "#aaa", lineHeight: 1.8 }}>
        <li>Call any paid endpoint without payment → 402 with pricing</li>
        <li>Use <code style={{ backgroundColor: "#1a1a1a", padding: "0.15rem 0.4rem", borderRadius: 4 }}>x402-fetch</code> to auto-handle payment</li>
        <li>USDC settles on Base Sepolia (testnet)</li>
      </ol>

      <p style={{ color: "#666", marginTop: "3rem", fontSize: "0.875rem" }}>
        Built with{" "}
        <a href="https://x402.org" style={{ color: "#3b82f6" }}>x402</a>
        {" · "}
        <a href="https://github.com/valeo-cash/x402-payments-skill" style={{ color: "#3b82f6" }}>Source</a>
      </p>
    </main>
  );
}
