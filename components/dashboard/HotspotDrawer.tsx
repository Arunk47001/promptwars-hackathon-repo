"use client";

import { useEffect, useState } from "react";
import type { CleanSubmissionRow, HotspotRow, ImpactComparison } from "@/app/dashboard/types";
import { colors, fonts } from "@/lib/theme";
import { REGION } from "@/lib/region";
import { severityLabel, SEVERITY_BADGE_COLORS } from "@/lib/colorScale";

interface Props {
  hotspot: HotspotRow;
  onClose: () => void;
  onActioned: () => void;
  onGoImpact: () => void;
}

/**
 * Right-side slide-over drawer (C5), converted from the old inline
 * `components/DetailPanel.tsx` block. Reuses the exact same real API calls
 * (`GET /api/hotspots/:id`, `POST /api/hotspots/:id/rationale`,
 * `GET`/`POST /api/hotspots/:id/action`) and real persisted before/after
 * comparison - only the presentation changed from an inline block to a
 * fixed-position overlay + panel, per the design's drawer layout.
 */
export default function HotspotDrawer({ hotspot, onClose, onActioned, onGoImpact }: Props) {
  const [submissions, setSubmissions] = useState<CleanSubmissionRow[]>([]);
  const [rationale, setRationale] = useState<string | null>(null);
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [rationaleError, setRationaleError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ImpactComparison | null>(null);

  useEffect(() => {
    setRationale(null);
    setRationaleError(null);
    setActionError(null);
    setComparison(null);
    fetch(`/api/hotspots/${hotspot.id}`)
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []));

    if (hotspot.is_actioned) {
      fetch(`/api/hotspots/${hotspot.id}/action`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.comparison) setComparison(data.comparison);
        })
        .catch(() => {
          // Non-fatal: the drawer still works without the persisted
          // comparison, it just won't show the funded before/after card.
        });
    }
  }, [hotspot.id, hotspot.is_actioned]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
    setActionError(null);
    try {
      const res = await fetch(`/api/hotspots/${hotspot.id}/action`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark actioned");
      setComparison(data.comparison);
      onActioned();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  }

  const severity = severityLabel(hotspot.composite_score);
  const severityColors = SEVERITY_BADGE_COLORS[severity];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div
        data-no-print="true"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: colors.scrimDrawer }}
      />
      <div
        data-print-root="true"
        style={{
          position: "relative",
          width: 480,
          maxWidth: "92vw",
          height: "100%",
          background: colors.surface,
          borderLeft: `1px solid ${colors.borderStrong}`,
          boxShadow: colors.drawerShadow,
          overflowY: "auto",
          fontFamily: fonts.sans
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: colors.surface,
            borderBottom: `1px solid ${colors.borderFaint}`,
            padding: "15px 18px 13px",
            zIndex: 2
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: colors.textFaint }}>
                {REGION} / {hotspot.category}
              </div>
              <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 600 }}>{hotspot.district}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-no-print="true"
              aria-label="Close"
              style={{
                marginLeft: "auto",
                border: `1px solid ${colors.borderStrong}`,
                background: colors.surface,
                borderRadius: 4,
                width: 26,
                height: 26,
                cursor: "pointer",
                color: "#4a4d52",
                fontSize: 13,
                lineHeight: 1
              }}
            >
              &#10005;
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 26, fontWeight: 600 }}>
              {hotspot.composite_score.toFixed(2)}
            </span>
            <span style={{ fontSize: 11.5, color: colors.textMuted }}>
              composite
              <br />
              score
            </span>
            <span
              style={{
                display: "inline-block",
                fontSize: 10.5,
                fontWeight: 500,
                borderRadius: 3,
                padding: "2px 7px",
                background: severityColors.bg,
                color: severityColors.fg,
                whiteSpace: "nowrap"
              }}
            >
              {severity} severity
            </span>
            <span
              style={{
                display: "inline-block",
                fontSize: 10.5,
                fontWeight: 500,
                borderRadius: 3,
                padding: "2px 7px",
                background: hotspot.is_actioned ? colors.successSoft : colors.neutralSoft,
                color: hotspot.is_actioned ? colors.successSoftText : colors.neutralSoftText,
                whiteSpace: "nowrap"
              }}
            >
              {hotspot.is_actioned ? "Funded / actioned" : "Not actioned"}
            </span>
          </div>
        </div>

        <div style={{ padding: "16px 18px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <div style={{ border: `1px solid ${colors.borderFaint}`, borderRadius: 5, padding: "10px 11px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: colors.textFaint }}>
                Demand
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 500, marginTop: 4 }}>
                {hotspot.demand_volume.toFixed(2)}
              </div>
            </div>
            <div style={{ border: `1px solid ${colors.borderFaint}`, borderRadius: 5, padding: "10px 11px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: colors.textFaint }}>
                Infra gap
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 500, marginTop: 4 }}>
                {hotspot.infra_gap_score.toFixed(2)}
              </div>
            </div>
            <div style={{ border: `1px solid ${colors.borderFaint}`, borderRadius: 5, padding: "10px 11px" }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: colors.textFaint }}>
                Invest. offset
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 500, marginTop: 4, color: colors.danger }}>
                {hotspot.investment_offset.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ border: `1px solid ${colors.borderFaint}`, borderRadius: 5, padding: "13px 14px", marginTop: 12, background: colors.panelSoft }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Policymaker rationale</div>
              <button
                type="button"
                data-no-print="true"
                onClick={loadRationale}
                disabled={rationaleLoading}
                style={{
                  marginLeft: "auto",
                  border: `1px solid ${colors.borderStrong}`,
                  background: colors.surface,
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 11.5,
                  fontFamily: fonts.sans,
                  cursor: rationaleLoading ? "default" : "pointer",
                  color: colors.ink
                }}
              >
                {rationaleLoading ? "Generating…" : rationale ? "Regenerate" : "Generate"}
              </button>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 9, color: rationale ? "#2a2d31" : colors.textFaint }}>
              {rationaleLoading
                ? "Generating…"
                : rationale ??
                  "Not generated yet. The rationale cites the request volume, the infrastructure-gap indicator, and any overlapping investment plan (Gemini 2.5 Pro)."}
            </div>
            {rationaleError && (
              <p style={{ color: colors.dangerSoftText, fontSize: 12, marginTop: 6 }}>
                {rationaleError} (Gemini API is not configured/verified in this environment - see
                docs/gemini-audio-spike.md.)
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }} data-no-print="true">
            <button
              type="button"
              onClick={markActioned}
              disabled={actionLoading || hotspot.is_actioned}
              style={{
                borderRadius: 4,
                padding: "9px 14px",
                fontSize: 12.5,
                fontWeight: 500,
                fontFamily: fonts.sans,
                border: `1px solid ${hotspot.is_actioned ? colors.border : colors.accent}`,
                background: hotspot.is_actioned ? colors.bg : colors.accent,
                color: hotspot.is_actioned ? colors.textFainter : "#fff",
                cursor: hotspot.is_actioned ? "default" : "pointer"
              }}
            >
              {hotspot.is_actioned
                ? "Already marked funded"
                : actionLoading
                  ? "Marking…"
                  : "Mark as funded / actioned"}
            </button>
            {hotspot.is_actioned && (
              <a
                href="#impact"
                onClick={(e) => {
                  e.preventDefault();
                  onGoImpact();
                }}
                style={{ fontSize: 12.5 }}
              >
                View full impact over time
              </a>
            )}
          </div>
          {actionError && (
            <p style={{ color: colors.dangerSoftText, fontSize: 12, marginTop: 6 }}>{actionError}</p>
          )}

          {hotspot.is_actioned && comparison && (
            <div style={{ border: `1px solid ${colors.tealBorder}`, background: colors.tealSoftBg, borderRadius: 5, padding: "12px 13px", marginTop: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f5d56" }}>Funded — before / after</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8, fontFamily: fonts.mono }}>
                <span style={{ fontSize: 17, color: colors.textMuted }}>
                  {comparison.preActionScore?.toFixed(2) ?? "n/a"}
                </span>
                <span style={{ color: colors.textFainter }}>&rarr;</span>
                <span style={{ fontSize: 22, fontWeight: 600, color: "#0f5d56" }}>
                  {comparison.postActionScore?.toFixed(2) ?? "not yet recomputed"}
                </span>
                {comparison.preActionScore != null && comparison.postActionScore != null && (
                  <span style={{ fontSize: 12, color: colors.tealText }}>
                    {(comparison.postActionScore - comparison.preActionScore >= 0 ? "+" : "") +
                      (comparison.postActionScore - comparison.preActionScore).toFixed(2)}{" "}
                    since action
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 6 }}>
                Re-engagement sent to {comparison.reengagementRecipientCount} citizen(s).
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Underlying citizen requests</div>
              <span style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.textMuted }}>
                {submissions.length}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: colors.textFaint }}>anonymized at intake</span>
            </div>
            {submissions.length === 0 && (
              <div style={{ fontSize: 12.5, color: colors.textFaint, marginTop: 8 }}>
                No submissions found for this district/category yet.
              </div>
            )}
            {submissions.map((s) => (
              <div key={s.id} style={{ border: `1px solid ${colors.borderFaint}`, borderRadius: 5, padding: "11px 12px", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      background: "#eef1f5",
                      color: "#4a4d52",
                      borderRadius: 3,
                      padding: "2px 6px"
                    }}
                  >
                    {s.channel}
                  </span>
                  <span style={{ fontSize: 11.5, color: colors.textMuted }}>
                    {s.district}
                    {s.block ? ` / ${s.block}` : ""}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: ".04em",
                      borderRadius: 3,
                      padding: "2px 6px",
                      background: s.urgency === "high" ? colors.dangerSoft : colors.warnSoft,
                      color: s.urgency === "high" ? colors.dangerSoftText : colors.warnSoftText
                    }}
                  >
                    urgency: {s.urgency}
                  </span>
                  {s.is_likely_duplicate && (
                    <span style={{ fontSize: 10, borderRadius: 3, padding: "2px 6px", background: colors.neutralSoft, color: colors.neutralSoftText }}>
                      duplicate
                    </span>
                  )}
                  {s.is_burst_flagged && (
                    <span style={{ fontSize: 10, borderRadius: 3, padding: "2px 6px", background: colors.neutralSoft, color: colors.neutralSoftText }}>
                      burst-flagged
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 8, color: colors.inkSoft }}>
                  {s.description}
                </div>
                <div style={{ fontSize: 10.5, color: colors.textFainter, marginTop: 7, fontFamily: fonts.mono }}>
                  {s.sentiment ? `sentiment: ${s.sentiment} · ` : ""}
                  {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
