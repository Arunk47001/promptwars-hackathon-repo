"use client";

import { useEffect, useState } from "react";
import { colors, fonts } from "@/lib/theme";
import { NATION, REGION } from "@/lib/region";
import AnonymizationToggle from "@/components/AnonymizationToggle";

interface SourceCard {
  kind: string;
  name: string;
  status: "Connected" | "No rows yet";
  detail: string;
  updated: string;
  coverage: string;
}

function statusStyle(status: string): React.CSSProperties {
  const connected = status === "Connected";
  return {
    fontSize: 10.5,
    fontWeight: 500,
    borderRadius: 3,
    padding: "2px 7px",
    background: connected ? colors.successSoft : colors.warnSoft,
    color: connected ? colors.successSoftText : colors.warnSoftText
  };
}

/**
 * Data sources & provenance screen (C7). Cards are populated from
 * `GET /api/data-sources` (real `count(*)`/`source_year` queries against
 * `ref_demographics`/`ref_infrastructure`/`ref_investment`/
 * `clean_submissions` plus a live read of the real district-boundary
 * GeoJSON), never the design file's literal "28 / 28 districts" numbers.
 * The anonymization before/after section reuses the existing
 * `AnonymizationToggle` component/route unchanged, per this task's
 * instruction to keep it "instead of building a new one."
 */
export default function DataSourcesScreen() {
  const [sources, setSources] = useState<SourceCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/data-sources")
      .then((res) => {
        if (!res.ok) throw new Error(`GET /api/data-sources failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSources(data.sources ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-.015em" }}>
          Data sources &amp; provenance
        </h1>
        <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 5 }}>
          What the fusion layer is built on for {NATION} / {REGION}, and how much of it has real
          data ingested right now.
        </div>
      </div>

      {error && (
        <p style={{ background: "#fff7ed", padding: "1rem", borderRadius: 8, fontSize: 13 }}>
          Could not load data sources: {error}
          {error.includes("DATABASE_URL") ? " (local Docker Postgres may not be running)" : ""}
        </p>
      )}
      {!sources && !error && <p style={{ fontSize: 13, color: colors.textMuted }}>Loading…</p>}

      {sources && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {sources.map((s) => (
            <div key={s.kind} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "15px 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: colors.textFaint }}>
                  {s.kind}
                </span>
                <span style={statusStyle(s.status)}>{s.status}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 1.5 }}>{s.detail}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, paddingTop: 11, borderTop: `1px solid ${colors.borderSubtle}` }}>
                <div>
                  <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: colors.textFainter }}>
                    Last updated
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 12, marginTop: 3, overflowWrap: "anywhere" }}>{s.updated}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: colors.textFainter }}>
                    Coverage
                  </div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 12, marginTop: 3 }}>{s.coverage}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "15px 16px 17px", marginTop: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Anonymization in effect</h2>
        <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
          Applied at intake, before any record reaches a policymaker-facing screen. This panel
          shows a real record&rsquo;s before/after pair via the existing
          <code> /api/debug/anonymization-sample</code> route.
        </div>
        <AnonymizationToggle />
        <div style={{ fontSize: 11.5, color: colors.textFaint, marginTop: 11 }}>
          Method: salted SHA-256 identifier hashing · named-entity scrubbing on free text ·
          location generalized to district (+ optional block/village).
        </div>
      </section>
    </div>
  );
}
