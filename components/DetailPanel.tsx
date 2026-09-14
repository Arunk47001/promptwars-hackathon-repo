"use client";

import { useEffect, useState } from "react";
import type { CleanSubmissionRow, HotspotRow, ImpactComparison } from "@/app/dashboard/types";
import SeverityBadge from "./SeverityBadge";

interface Props {
  hotspot: HotspotRow;
  onActioned: () => void;
}

export default function DetailPanel({ hotspot, onActioned }: Props) {
  const [submissions, setSubmissions] = useState<CleanSubmissionRow[]>([]);
  const [rationale, setRationale] = useState<string | null>(null);
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [rationaleError, setRationaleError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comparison, setComparison] = useState<ImpactComparison | null>(null);

  useEffect(() => {
    setRationale(null);
    setComparison(null);
    fetch(`/api/hotspots/${hotspot.id}`)
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []));

    // Show the persisted before/after comparison on every open, not just
    // right after clicking "mark as actioned" - closes the design gap
    // flagged in .squad/designer/: the panel previously only showed impact
    // info transiently in the same session it was actioned.
    if (hotspot.is_actioned) {
      fetch(`/api/hotspots/${hotspot.id}/action`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.comparison) setComparison(data.comparison);
        })
        .catch(() => {
          // Non-fatal: the panel still works without the persisted
          // comparison, it just won't show the impact summary.
        });
    }
  }, [hotspot.id, hotspot.is_actioned]);

  async function loadRationale() {
    setRationaleLoading(true);
    setRationaleError(null);
    try {
      const res = await fetch(`/api/hotspots/${hotspot.id}/rationale`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate rationale");
      setRationale(data.rationale);
    } catch (err) {
      setRationaleError(err instanceof Error ? err.message : String(err));
    } finally {
      setRationaleLoading(false);
    }
  }

  async function markActioned() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/hotspots/${hotspot.id}/action`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark actioned");
      setComparison(data.comparison);
      onActioned();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
      <h3>
        {hotspot.district} — {hotspot.category}
      </h3>
      <p>
        Composite score: <strong>{hotspot.composite_score.toFixed(2)}</strong>{" "}
        <SeverityBadge score={hotspot.composite_score} /> (demand{" "}
        {hotspot.demand_volume.toFixed(2)}, infra-gap {hotspot.infra_gap_score.toFixed(2)},
        investment offset {hotspot.investment_offset.toFixed(2)})
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={loadRationale} disabled={rationaleLoading}>
          {rationaleLoading ? "Generating rationale..." : "Generate policymaker rationale (Gemini 2.5 Pro)"}
        </button>
        {rationaleError && (
          <p style={{ color: "#b91c1c" }}>
            {rationaleError}. (Gemini API is not configured/verified in this environment - see
            docs/gemini-audio-spike.md.)
          </p>
        )}
        {rationale && <p style={{ background: "#f8fafc", padding: "0.75rem" }}>{rationale}</p>}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={markActioned} disabled={actionLoading || hotspot.is_actioned}>
          {hotspot.is_actioned
            ? "Already marked as actioned"
            : actionLoading
              ? "Marking as actioned..."
              : "Mark as funded/actioned + trigger re-engagement"}
        </button>
        {comparison && (
          <div style={{ marginTop: "0.5rem" }}>
            <p>
              Before: <strong>{comparison.preActionScore?.toFixed(2) ?? "n/a"}</strong> → After:{" "}
              <strong>{comparison.postActionScore?.toFixed(2) ?? "n/a"}</strong>
            </p>
            <p>Re-engagement sent to {comparison.reengagementRecipientCount} citizen(s).</p>
            <p style={{ fontSize: 13, color: "#555" }}>
              This is the impact summary for this single action. A full
              impact-over-time trend view across all actioned hotspots is
              designed but not yet built — see
              .squad/designer/brics-citizen-infrastructure-platform.md
              (screen 7, &ldquo;Impact tracking&rdquo;).
            </p>
          </div>
        )}
      </div>

      <h4>Underlying anonymized citizen requests ({submissions.length})</h4>
      <ul style={{ maxHeight: 240, overflowY: "auto", paddingLeft: "1rem" }}>
        {submissions.map((s) => (
          <li key={s.id} style={{ marginBottom: "0.5rem" }}>
            <div>
              <em>
                [{s.channel}] {s.district}
                {s.block ? ` / ${s.block}` : ""}
                {s.village ? ` / ${s.village}` : ""} — urgency: {s.urgency}, sentiment:{" "}
                {s.sentiment ?? "n/a"}
                {s.is_likely_duplicate ? " — DUPLICATE (down-weighted)" : ""}
                {s.is_burst_flagged ? " — BURST-FLAGGED" : ""}
              </em>
            </div>
            <div>{s.description}</div>
          </li>
        ))}
        {submissions.length === 0 && <li>No submissions found for this district/category yet.</li>}
      </ul>
    </div>
  );
}
