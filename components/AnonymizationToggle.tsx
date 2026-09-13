"use client";

import { useEffect, useState } from "react";
import type { AnonymizationSample } from "@/app/dashboard/types";

export default function AnonymizationToggle() {
  const [sample, setSample] = useState<AnonymizationSample | null>(null);
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    fetch("/api/debug/anonymization-sample")
      .then((res) => res.json())
      .then(setSample)
      .catch((err) => console.error("Failed to load anonymization sample:", err));
  }, []);

  if (!sample) return null;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0 }}>Anonymization debug view</h4>
        <button onClick={() => setShowAfter((v) => !v)} data-testid="anonymization-toggle">
          Show {showAfter ? "BEFORE (raw intake)" : "AFTER (anonymized)"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "#666" }}>
        Source: {sample.source === "real_processed_submission"
          ? "a real processed submission from this database"
          : "a synthetic example run through the real anonymization module (no processed submissions yet)"}
      </p>
      {!showAfter ? (
        <div data-testid="anonymization-before">
          <p>
            <strong>Phone (plaintext, intake-only table):</strong> {sample.before.phoneNumber}
          </p>
          <p>
            <strong>Raw text:</strong> {sample.before.rawText}
          </p>
          <p>
            <strong>Precise location:</strong>{" "}
            {sample.before.preciseLat !== null
              ? `${sample.before.preciseLat}, ${sample.before.preciseLng}`
              : "n/a"}
          </p>
        </div>
      ) : (
        <div data-testid="anonymization-after">
          <p>
            <strong>Phone hash (salted, one-way):</strong> {sample.after.phoneHash}
          </p>
          <p>
            <strong>Description (PII-scrubbed):</strong> {sample.after.description}
          </p>
          <p>
            <strong>Generalized location:</strong> {sample.after.district}
            {sample.after.block ? ` / ${sample.after.block}` : ""}
            {sample.after.village ? ` / ${sample.after.village}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
