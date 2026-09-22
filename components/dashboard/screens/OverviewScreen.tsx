"use client";

import type { HotspotRow } from "@/app/dashboard/types";
import { colors, fonts } from "@/lib/theme";
import { NATION, REGION } from "@/lib/region";
import {
  computeOverviewKpis,
  computeRecentActivity,
  topHotspots
} from "@/lib/dashboardMetrics";
import { severityLabel, SEVERITY_BADGE_COLORS } from "@/lib/colorScale";
import DistrictGrid from "../DistrictGrid";

interface Props {
  hotspots: HotspotRow[];
  loading: boolean;
  onOpenHotspot: (hotspot: HotspotRow) => void;
  onGoHotspots: () => void;
}

function SeverityPill({ score }: { score: number }) {
  const label = severityLabel(score);
  const { bg, fg } = SEVERITY_BADGE_COLORS[label];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10.5,
        fontWeight: 500,
        letterSpacing: ".02em",
        borderRadius: 3,
        padding: "2px 7px",
        whiteSpace: "nowrap",
        background: bg,
        color: fg
      }}
    >
      {label} severity
    </span>
  );
}

export default function OverviewScreen({ hotspots, loading, onOpenHotspot, onGoHotspots }: Props) {
  const kpis = computeOverviewKpis(hotspots);
  const top = topHotspots(hotspots, 5);
  const activity = computeRecentActivity(hotspots, 6);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-.015em" }}>
            Dashboard overview
          </h1>
          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 5 }}>
            {NATION} / {REGION} · citizen demand fused with demographic, infrastructure and
            investment data
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onGoHotspots}
            style={{
              border: `1px solid ${colors.accent}`,
              background: colors.accent,
              color: "#fff",
              borderRadius: 4,
              padding: "7px 13px",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: fonts.sans,
              cursor: "pointer"
            }}
          >
            View all hotspots
          </button>
        </div>
      </div>

      {loading && hotspots.length === 0 && (
        <p style={{ fontSize: 13, color: colors.textMuted }}>Loading real hotspot data…</p>
      )}
      {!loading && hotspots.length === 0 && (
        <p
          style={{
            background: "#fff7ed",
            padding: "1rem",
            borderRadius: 8,
            fontSize: 13
          }}
        >
          No hotspot scores yet. Run <code>npm run ingest</code>, submit test citizen requests via
          the webhook routes, process them via the worker route, then recompute scores from the
          Hotspot explorer screen.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={onGoHotspots}
            style={{
              textAlign: "left",
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: "14px 15px 15px",
              cursor: "pointer",
              fontFamily: fonts.sans,
              display: "block"
            }}
          >
            <div style={{ fontSize: 11.5, color: colors.textMuted, letterSpacing: ".01em", minHeight: 32 }}>
              {k.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 600, fontFamily: fonts.mono, letterSpacing: "-.02em" }}>
                {k.value}
              </span>
            </div>
            <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 6 }}>{k.sub}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: 12,
          marginTop: 12,
          alignItems: "start"
        }}
      >
        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "14px 15px 16px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>
            Composite demand score by district
          </h2>
          <div style={{ fontSize: 11.5, color: colors.textFaint, marginBottom: 12 }}>
            District grid — one cell per real district with a computed score. Equivalent data
            is in the ranked table on the Hotspot explorer screen.
          </div>
          <DistrictGrid hotspots={hotspots} selectedId={null} onSelect={onOpenHotspot} columns={7} cellHeight={52} />
        </section>

        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "14px 15px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Top hotspots</h2>
            <a
              href="#hotspots"
              onClick={(e) => {
                e.preventDefault();
                onGoHotspots();
              }}
              style={{ marginLeft: "auto", fontSize: 12 }}
            >
              View all {hotspots.length}
            </a>
          </div>
          {top.length === 0 && (
            <div style={{ fontSize: 12.5, color: colors.textFaint, padding: "10px 4px" }}>
              No hotspots yet.
            </div>
          )}
          {top.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onOpenHotspot(h)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "grid",
                gridTemplateColumns: "22px minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                padding: "10px 4px",
                border: 0,
                borderTop: `1px solid ${colors.borderSubtle}`,
                background: "none",
                fontFamily: fonts.sans,
                cursor: "pointer"
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textFainter }}>{i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>{h.district}</span>
                <span style={{ display: "block", fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                  {h.category} · {h.submission_count} requests
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SeverityPill score={h.composite_score} />
                <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 500 }}>
                  {h.composite_score.toFixed(2)}
                </span>
              </span>
            </button>
          ))}
        </section>
      </div>

      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: "14px 15px 6px",
          marginTop: 12
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Recent activity</h2>
        <div style={{ fontSize: 11.5, color: colors.textFaint, marginBottom: 8 }}>
          Actioned hotspots and score-recompute events derived from real data (a fuller
          event-level activity log is not yet built - see status report)
        </div>
        {activity.length === 0 && (
          <div style={{ fontSize: 12.5, color: colors.textFaint, padding: "9px 2px" }}>
            No activity yet.
          </div>
        )}
        {activity.map((a) => (
          <div
            key={a.id}
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr auto",
              gap: 14,
              alignItems: "baseline",
              padding: "9px 2px",
              borderTop: `1px solid ${colors.borderSubtle}`
            }}
          >
            <span style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.textFaint }}>
              {new Date(a.when).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
              })}
            </span>
            <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{a.text}</span>
            <span
              style={{
                fontSize: 10.5,
                letterSpacing: ".04em",
                borderRadius: 3,
                padding: "2px 7px",
                whiteSpace: "nowrap",
                background: a.tag === "Actioned" ? colors.successSoft : colors.neutralSoft,
                color: a.tag === "Actioned" ? colors.successSoftText : colors.neutralSoftText
              }}
            >
              {a.tag}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
