"use client";

import { useEffect, useMemo, useState } from "react";
import { colors, fonts } from "@/lib/theme";
import {
  computeImpactKpis,
  impactTrend,
  type ImpactActionRow
} from "@/lib/dashboardMetrics";

interface Props {
  onOpenExport: (actions: ImpactActionRow[]) => void;
}

function chipStyle(on: boolean): React.CSSProperties {
  return {
    border: `1px solid ${on ? colors.accent : colors.borderStrong}`,
    background: on ? colors.accentSoft : colors.surface,
    color: on ? colors.accentSoftText : "#4a4d52",
    borderRadius: 4,
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: fonts.sans,
    cursor: "pointer"
  };
}

function trendChipStyle(trend: string): React.CSSProperties {
  const c =
    trend === "Improving"
      ? { bg: colors.successSoft, fg: colors.successSoftText }
      : trend === "Worsening"
        ? { bg: colors.dangerSoft, fg: colors.dangerSoftText }
        : { bg: colors.neutralSoft, fg: colors.neutralSoftText };
  return { display: "inline-block", fontSize: 10.5, fontWeight: 500, borderRadius: 3, padding: "2px 7px", background: c.bg, color: c.fg };
}

/**
 * Two-point before/after SVG "trend" for a single project (C6). The
 * design's chart implies a monthly historical time series
 * (`SERIES`/`FEEDBACK`, 9 points/project); `hotspot_scores` only actually
 * stores a pre-action and (if recomputed) a post-action row per
 * `impact_actions` - no interpolated monthly history - so this renders the
 * real two-point comparison instead of fabricating intermediate months.
 */
function TwoPointChart({ action }: { action: ImpactActionRow }) {
  const W = 560;
  const H = 200;
  const pad = 44;
  if (action.preScore === null) {
    return (
      <div style={{ fontSize: 12.5, color: colors.textFaint, padding: "40px 0", textAlign: "center" }}>
        No pre-action score recorded for this project.
      </div>
    );
  }
  const hasPost = action.postScore !== null;
  const values = hasPost ? [action.preScore, action.postScore as number] : [action.preScore];
  const max = Math.max(...values) + 0.3;
  const min = Math.min(...values) - 0.3;
  const range = max - min || 1;
  const y = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2 - 10);
  const x0 = pad;
  const x1 = W - pad;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200, display: "block" }} role="img" aria-label="Composite score before and after this project's funding action">
      <line x1={pad} x2={W - pad} y1={20} y2={20} stroke={colors.borderSubtle} strokeWidth={1} />
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke={colors.borderSubtle} strokeWidth={1} />
      {hasPost && (
        <line x1={x0} y1={y(action.preScore)} x2={x1} y2={y(action.postScore as number)} stroke={colors.accent} strokeWidth={2.5} />
      )}
      <circle cx={x0} cy={y(action.preScore)} r={4} fill="#fff" stroke={colors.accent} strokeWidth={1.75} />
      <text x={x0} y={H - 12} fill={colors.textFainter} fontSize={10.5} textAnchor="middle" fontFamily={fonts.mono}>
        Before
      </text>
      <text x={x0} y={y(action.preScore) - 10} fill={colors.ink} fontSize={11.5} textAnchor="middle" fontFamily={fonts.mono}>
        {action.preScore.toFixed(2)}
      </text>
      {hasPost ? (
        <>
          <circle cx={x1} cy={y(action.postScore as number)} r={4} fill="#fff" stroke={colors.accent} strokeWidth={1.75} />
          <text x={x1} y={H - 12} fill={colors.textFainter} fontSize={10.5} textAnchor="middle" fontFamily={fonts.mono}>
            Latest
          </text>
          <text x={x1} y={y(action.postScore as number) - 10} fill={colors.ink} fontSize={11.5} textAnchor="middle" fontFamily={fonts.mono}>
            {(action.postScore as number).toFixed(2)}
          </text>
        </>
      ) : (
        <text x={x1} y={H / 2} fill={colors.textFaint} fontSize={11.5} textAnchor="middle">
          not yet recomputed
        </text>
      )}
    </svg>
  );
}

export default function ImpactTrackingScreen({ onOpenExport }: Props) {
  const [actions, setActions] = useState<ImpactActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/impact")
      .then((res) => {
        if (!res.ok) throw new Error(`GET /api/impact failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setActions(data.actions ?? []);
        setSelectedId(data.actions?.[0]?.id ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = useMemo(() => computeImpactKpis(actions), [actions]);
  const selected = actions.find((a) => a.id === selectedId) ?? actions[0] ?? null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-.015em" }}>
            Impact tracking
          </h1>
          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 5 }}>
            Funded projects against real before/after composite scores. Metric definitions are
            provisional (see status report for what is and isn&rsquo;t computable from the current
            schema).
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => onOpenExport(actions)}
            style={{
              border: `1px solid ${colors.borderStrong}`,
              background: colors.surface,
              borderRadius: 4,
              padding: "7px 12px",
              fontSize: 12.5,
              fontFamily: fonts.sans,
              cursor: "pointer",
              color: colors.ink
            }}
          >
            Export summary
          </button>
        </div>
      </div>

      {error && (
        <p style={{ background: "#fff7ed", padding: "1rem", borderRadius: 8, fontSize: 13 }}>
          Could not load impact data: {error}
          {error.includes("DATABASE_URL") ? " (local Docker Postgres may not be running)" : ""}
        </p>
      )}
      {loading && <p style={{ fontSize: 13, color: colors.textMuted }}>Loading real impact data…</p>}

      {!loading && !error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))`, gap: 12 }}>
            {kpis.map((k) => (
              <div key={k.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "14px 15px 15px" }}>
                <div style={{ fontSize: 11.5, color: colors.textMuted, minHeight: 32 }}>{k.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, fontFamily: fonts.mono, letterSpacing: "-.02em" }}>
                    {k.value}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 6 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "15px 16px 18px", marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {selected ? `${selected.district} — ${selected.category}` : "No actioned projects yet"}
                </h2>
                <div style={{ fontSize: 11.5, color: colors.textFaint, marginTop: 3 }}>
                  Real before/after composite score for this project (two-point comparison, not an
                  interpolated monthly series)
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 380, justifyContent: "flex-end" }}>
                {actions.slice(0, 8).map((a) => (
                  <button key={a.id} type="button" onClick={() => setSelectedId(a.id)} style={chipStyle(selectedId === a.id)}>
                    {a.district}
                  </button>
                ))}
              </div>
            </div>
            {selected ? (
              <TwoPointChart action={selected} />
            ) : (
              <div style={{ fontSize: 12.5, color: colors.textFaint, padding: "40px 0", textAlign: "center" }}>
                No hotspots have been marked funded/actioned yet.
              </div>
            )}
          </section>

          <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: "hidden", marginTop: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.6fr) 104px 74px 74px 96px 96px",
                gap: 8,
                padding: "9px 14px",
                background: colors.panelSoft,
                borderBottom: `1px solid ${colors.borderFaint}`,
                fontSize: 10.5,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: colors.textMuted
              }}
            >
              <span>Project</span>
              <span>Action date</span>
              <span style={{ textAlign: "right" }}>Before</span>
              <span style={{ textAlign: "right" }}>Latest</span>
              <span>Trend</span>
              <span style={{ textAlign: "right" }}>Re-engagement</span>
            </div>
            {actions.length === 0 && (
              <div style={{ padding: 16, fontSize: 12.5, color: colors.textFaint }}>
                No hotspots have been marked funded/actioned yet.
              </div>
            )}
            {actions.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.6fr) 104px 74px 74px 96px 96px",
                  gap: 8,
                  padding: "11px 14px",
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                  alignItems: "center",
                  cursor: "pointer",
                  background: selectedId === a.id ? colors.panelSoft : "transparent"
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 500 }}>{a.district}</span>
                  <span style={{ display: "block", fontSize: 11, color: colors.textFaint, marginTop: 2 }}>{a.category}</span>
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 11.5, color: "#4a4d52" }}>
                  {new Date(a.actionedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 12.5, color: "#4a4d52" }}>
                  {a.preScore?.toFixed(2) ?? "—"}
                </span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 12.5, fontWeight: 500 }}>
                  {a.postScore?.toFixed(2) ?? "pending"}
                </span>
                <span>
                  <span style={trendChipStyle(impactTrend(a))}>{impactTrend(a)}</span>
                </span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 12 }}>
                  {a.reengagementRecipientCount}
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
