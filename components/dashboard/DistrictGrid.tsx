"use client";

import { useMemo } from "react";
import type { HotspotRow } from "@/app/dashboard/types";
import { colors, fonts, rampBlue } from "@/lib/theme";
import { colorForScore, isDarkCell, relativeSeverityLabel } from "@/lib/colorScale";

interface DistrictCell {
  district: string;
  short: string;
  score: number | undefined;
  hotspot: HotspotRow | undefined;
}

interface Props {
  hotspots: HotspotRow[];
  selectedId: string | null;
  onSelect: (hotspot: HotspotRow) => void;
  columns?: number;
  cellHeight?: number;
}

function shortName(district: string): string {
  if (district.length <= 10) return district;
  const parts = district.split(" ");
  if (parts.length > 1) {
    return parts.map((p, i) => (i === 0 ? p.slice(0, 6) : p[0] + ".")).join(" ");
  }
  return district.slice(0, 9) + ".";
}

/**
 * Compact colored district-cell mosaic (C3/C4). Replaces the design's
 * fixed 28-district `BASE` mock array with one cell per *real* district
 * that has at least one computed hotspot row for the currently-selected
 * category filter, colored on the shared colorblind-safe single-hue scale
 * (`lib/colorScale.ts` - the same logic `HotspotMap`'s choropleth already
 * used before this redesign). When a district has multiple categories, the
 * cell shows its highest composite score (same aggregation the existing
 * `HotspotMap` used for `scoresByDistrict`).
 */
export default function DistrictGrid({
  hotspots,
  selectedId,
  onSelect,
  columns = 7,
  cellHeight = 58
}: Props) {
  const cells = useMemo<DistrictCell[]>(() => {
    const byDistrict = new Map<string, HotspotRow>();
    for (const h of hotspots) {
      const existing = byDistrict.get(h.district);
      if (!existing || h.composite_score > existing.composite_score) {
        byDistrict.set(h.district, h);
      }
    }
    return Array.from(byDistrict.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([district, hotspot]) => ({
        district,
        short: shortName(district),
        score: hotspot.composite_score,
        hotspot
      }));
  }, [hotspots]);

  const { max, min } = useMemo(() => {
    const values = cells.map((c) => c.score).filter((v): v is number => v !== undefined);
    return {
      max: values.length ? Math.max(...values) : 1,
      min: values.length ? Math.min(...values) : 0
    };
  }, [cells]);

  if (cells.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: colors.textFaint, padding: "8px 2px" }}>
        No scored districts yet. Run <code>npm run ingest</code>, submit/process some citizen
        requests, then recompute scores.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: colors.textMuted, marginBottom: 8 }}>
        <span>{min.toFixed(2)}</span>
        {rampBlue.map((c) => (
          <span key={c} style={{ display: "inline-block", width: 13, height: 9, background: c }} />
        ))}
        <span>{max.toFixed(2)}</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 4
        }}
      >
        {cells.map((c) => {
          const selected = c.hotspot ? c.hotspot.id === selectedId : false;
          const dark = isDarkCell(c.score, max, min);
          return (
            <button
              key={c.district}
              type="button"
              onClick={() => c.hotspot && onSelect(c.hotspot)}
              aria-label={`${c.district}: composite score ${c.score?.toFixed(2) ?? "no data"}, ${relativeSeverityLabel(c.score, max, min)}`}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 6,
                height: cellHeight,
                borderRadius: 3,
                padding: "6px 7px",
                cursor: "pointer",
                fontFamily: fonts.sans,
                textAlign: "left",
                background: colorForScore(c.score, max, min),
                color: dark ? "#ffffff" : colors.ink,
                border: selected ? "2px solid #1a1c1e" : "1px solid rgba(26,28,30,.08)"
              }}
            >
              <span style={{ fontSize: 9.5, lineHeight: 1.15, fontWeight: 500, letterSpacing: "-.01em" }}>
                {c.short}
              </span>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 500 }}>
                {c.score?.toFixed(2) ?? "—"}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 10, lineHeight: 1.5 }}>
        Sequential single-hue scale, colorblind-safe. Every value shown here is also in the ranked
        table, the equal-access alternative to the grid.
      </div>
    </div>
  );
}
