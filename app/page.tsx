import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "3rem", maxWidth: 720, margin: "0 auto" }}>
      <h1>BRICS Citizen Infrastructure Platform</h1>
      <p>
        Multilingual, multi-channel citizen intake fused with real Indian
        demographic, infrastructure, and public-investment data to surface
        explainable demand hotspots for policymakers.
      </p>
      <p>
        <Link href="/dashboard">Open the policymaker dashboard →</Link>
      </p>
    </main>
  );
}
