"use client";

import { useEffect, useMemo, useState } from "react";
import type { HotspotRow } from "@/app/dashboard/types";
import { colors, fonts } from "@/lib/theme";
import { computeComposition } from "@/lib/dashboardMetrics";
import DistrictGrid from "../DistrictGrid";

interface Props {
  hotspots: HotspotRow[];
  loading: boolean;
  recomputing: boolean;
  onRecompute: () => void;
  onOpenHotspot: (hotspot: HotspotRow) => void;
  selectedId: string | null;
  onOpenExport: () => void;
  category: string;
  onCategoryChange: (c: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onFilteredChange: (filtered: HotspotRow[]) => void;
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
    cursor: "pointer",
    minHeight: 32
  };
}

function statusBadgeStyle(actioned: boolean): React.CSSProperties {
  return actioned
    ? { display: "inline-block", fontSize: 10.5, fontWeight: 500, borderRadius: 3, padding: "2px 7px", background: colors.successSoft, color: colors.successSoftText, whiteSpace: "nowrap" }
    : { display: "inline-block", fontSize: 10.5, fontWeight: 500, borderRadius: 3, padding: "2px 7px", background: colors.neutralSoft, color: colors.neutralSoftText, whiteSpace: "nowrap" };
}

export default function HotspotExplorerScreen({
  hotspots,
  loading,
  recomputing,
  onRecompute,
  onOpenHotspot,
  selectedId,
  onOpenExport,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  onFilteredChange
}: Props) {
  const [sortDesc, setSortDesc] = useState(true);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(hotspots.map((h) => h.category))).sort()],
    [hotspots]
  );

  const filtered = useMemo(() => {
    const byCategory = hotspots.filter((h) => category === "All" || h.category === category);
    const byQuery = query
      ? byCategory.filter((h) => h.district.toLowerCase().includes(query.toLowerCase()))
      : byCategory;
    const sorted = [...byQuery].sort((a, b) =>
      sortDesc ? b.composite_score - a.composite_score : a.composite_score - b.composite_score
    );
    return sorted;
  }, [hotspots, category, query, sortDesc]);

  // Rank is always relative to the full real data set (not the filtered
  // view), matching the design's `rankOf` behavior.
  const rankOf = useMemo(() => {
    const ranked = [...hotspots].sort((a, b) => b.composite_score - a.composite_score);
    const map = new Map<string, number>();
    ranked.forEach((h, i) => map.set(h.id, i + 1));
    return map;
  }, [hotspots]);

  // Report the currently-filtered set up to the parent so the Export modal
  // can offer a real "Current filtered view" CSV scope (C8).
  useEffect(() => {
    onFilteredChange(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const composition = computeComposition(hotspots, 8);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-.015em" }}>
            Hotspot explorer
          </h1>
          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 5 }}>
            Ranked, explainable demand hotspots. Select a district or a row to open its evidence
            trail.
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onRecompute}
            disabled={recomputing || loading}
            style={{
              border: `1px solid ${colors.borderStrong}`,
              background: colors.surface,
              borderRadius: 4,
              padding: "7px 12px",
              fontSize: 12.5,
              fontFamily: fonts.sans,
              cursor: recomputing || loading ? "default" : "pointer",
              color: colors.ink
            }}
          >
            {recomputing ? "Recomputing…" : "Recompute scores"}
          </button>
          <button
            type="button"
            onClick={onOpenExport}
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
            Export report
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: "9px 11px",
          marginBottom: 12
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: colors.textFaint, marginRight: 2 }}>
          Category
        </span>
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => onCategoryChange(c)} style={chipStyle(category === c)}>
            {c}
          </button>
        ))}
        <div style={{ width: 1, height: 22, background: colors.borderSubtle, margin: "0 4px" }} />
        <div
          style={{
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 12,
            color: colors.textFaint,
            background: colors.panelSoft,
            cursor: "not-allowed"
          }}
          title="Not wired: clean_submissions has an urgency field per individual citizen request, but hotspot_scores (the aggregated district+category rows this table/grid render) has no per-hotspot urgency column to filter on honestly. See status report."
        >
          Urgency: not available per hotspot
        </div>
        <div
          style={{
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 12,
            color: colors.textFaint,
            background: colors.panelSoft,
            cursor: "not-allowed"
          }}
          title="Not wired: hotspot_scores rows aren't timestamped per underlying request date range. See status report."
        >
          Date range: not available per hotspot
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search district"
          style={{
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: fonts.sans,
            width: 150,
            background: colors.surface,
            color: colors.ink
          }}
        />
        <div style={{ marginLeft: "auto", fontSize: 12, color: colors.textMuted, fontFamily: fonts.mono }}>
          {filtered.length} of {hotspots.length} hotspots
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(540px, 1fr))", gap: 12, alignItems: "start" }}>
        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "13px 14px 15px" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>District grid</h2>
          <DistrictGrid hotspots={filtered} selectedId={selectedId} onSelect={onOpenHotspot} columns={5} cellHeight={66} />
        </section>

        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "30px minmax(120px, 1.5fr) 76px 52px 52px 52px 52px 76px",
              gap: 6,
              padding: "9px 12px",
              minWidth: 560,
              background: colors.panelSoft,
              borderBottom: `1px solid ${colors.borderFaint}`,
              fontSize: 10.5,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              color: colors.textMuted
            }}
          >
            <span>#</span>
            <span>District</span>
            <span>Category</span>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              style={{ textAlign: "right", border: 0, background: "none", font: "inherit", letterSpacing: "inherit", textTransform: "inherit", color: "inherit", cursor: "pointer", padding: 0 }}
            >
              Score {sortDesc ? "↓" : "↑"}
            </button>
            <span style={{ textAlign: "right" }}>Demand</span>
            <span style={{ textAlign: "right" }}>Gap</span>
            <span style={{ textAlign: "right" }}>Offset</span>
            <span>Status</span>
          </div>
          <div style={{ maxHeight: 486, overflowY: "auto", overflowX: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: 16, fontSize: 12.5, color: colors.textFaint }}>
                No hotspots match the current filters.
              </div>
            )}
            {filtered.map((h) => (
              <div
                key={h.id}
                onClick={() => onOpenHotspot(h)}
                tabIndex={0}
                role="button"
                aria-label={`${h.district}, ${h.category}, composite score ${h.composite_score.toFixed(2)}`}
                data-testid="hotspot-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px minmax(0,1.5fr) 82px 58px 58px 58px 62px 78px",
                  gap: 6,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                  cursor: "pointer",
                  background: selectedId === h.id ? "#eef4fa" : "transparent",
                  minWidth: 560
                }}
              >
                <span style={{ fontFamily: fonts.mono, fontSize: 11.5, color: colors.textFainter }}>
                  {rankOf.get(h.id)}
                </span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{h.district}</span>
                  <span style={{ fontSize: 11, color: colors.textFaint, marginLeft: 6 }}>
                    {h.submission_count} req
                  </span>
                </span>
                <span style={{ fontSize: 11.5, color: "#4a4d52" }}>{h.category}</span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 12.5, fontWeight: 500 }}>
                  {h.composite_score.toFixed(2)}
                </span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 11.5, color: "#4a4d52" }}>
                  {h.demand_volume.toFixed(2)}
                </span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 11.5, color: "#4a4d52" }}>
                  {h.infra_gap_score.toFixed(2)}
                </span>
                <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 11.5, color: colors.danger }}>
                  {h.investment_offset.toFixed(2)}
                </span>
                <span>
                  <span style={statusBadgeStyle(h.is_actioned)}>{h.is_actioned ? "Actioned" : "Open"}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: "14px 15px 16px", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Score composition</h2>
          <div style={{ display: "flex", gap: 14, marginLeft: "auto", fontSize: 11.5, color: "#4a4d52" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: colors.compositionDemand }} />
              Citizen demand
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: colors.compositionGap }} />
              Infrastructure gap
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: colors.compositionOffset }} />
              Investment offset
            </span>
          </div>
        </div>
        {composition.length === 0 && (
          <div style={{ fontSize: 12.5, color: colors.textFaint }}>No hotspots to compose yet.</div>
        )}
        {composition.map((c) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "160px minmax(0, 1fr) 52px", gap: 12, alignItems: "center", padding: "5px 0" }}>
            <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.district} · {c.category}
            </span>
            <span style={{ display: "flex", height: 16, borderRadius: 2, overflow: "hidden", background: "#f4f2ed" }}>
              <span style={{ display: "block", height: "100%", background: colors.compositionDemand, width: `${c.demandPct}%` }} />
              <span style={{ display: "block", height: "100%", background: colors.compositionGap, width: `${c.gapPct}%` }} />
              <span style={{ display: "block", height: "100%", background: colors.compositionOffset, width: `${c.offsetPct}%` }} />
            </span>
            <span style={{ textAlign: "right", fontFamily: fonts.mono, fontSize: 12, fontWeight: 500 }}>{c.score}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
