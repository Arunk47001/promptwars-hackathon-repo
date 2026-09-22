import { rampBlue } from "./theme";

/**
 * Shared score -> color / severity-label logic (C1/C3/C4 of
 * .squad/task/redesign-dashboard-per-design-canvas.md).
 *
 * This centralizes what used to live only inside `components/HotspotMap.tsx`
 * (see git history) so the new district-grid mosaic (Overview + Hotspot
 * explorer screens) uses the *exact same* colorblind-safe single-hue scale
 * and "no variance" tie-handling as the existing Leaflet map, per the task
 * breakdown's instruction to reuse "the existing HotspotMap/colorForScore
 * fix, not the design's raw literal ramp." `HotspotMap.tsx` now imports
 * from here instead of declaring its own copy.
 */

/**
 * Colorblind-safe single-hue sequential scale (light -> dark blue), per
 * .squad/designer/brics-citizen-infrastructure-platform.md's "Divergence
 * flag": composite score is a single sequential severity measure, not a
 * diverging good/bad axis, so it should never be encoded as a
 * red-green-blue hue interpolation (misreads as diverging, and isn't
 * distinguishable for red-green color-vision deficiencies). This ramps
 * lightness only, within one hue.
 */
export function colorForScore(score: number | undefined, max: number, min: number): string {
  if (score === undefined) return "#e0e0e0";
  // When every scored district ties (no variance - e.g. only 1-2 distinct
  // district+category groups exist yet), there's no real "low" vs "high"
  // end of the range, so don't collapse everything to t=0 (which renders
  // as near-invisible on this light-to-dark scale) - use a visible mid
  // tone instead, so tied hotspots still stand out on the map/grid.
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (score - min) / range));
  // Light blue (#eff6ff) -> dark blue (#1e3a8a), interpolated per channel.
  const light = { r: 0xef, g: 0xf6, b: 0xff };
  const dark = { r: 0x1e, g: 0x3a, b: 0x8a };
  const r = Math.round(light.r + (dark.r - light.r) * t);
  const g = Math.round(light.g + (dark.g - light.g) * t);
  const b = Math.round(light.b + (dark.b - light.b) * t);
  return `rgb(${r},${g},${b})`;
}

/** Whether a light or dark foreground color should sit on top of `colorForScore`'s output at position `t` (0..1). */
export function isDarkCell(score: number | undefined, max: number, min: number): boolean {
  if (score === undefined) return false;
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (score - min) / range));
  return t >= 0.6;
}

/**
 * Relative (percentile-of-currently-displayed-range) severity label, used
 * for map/grid tooltips - distinct from the absolute z-score-threshold
 * `severityLabel` below (used for badges), because a grid cell's color is
 * always relative to what's currently on screen.
 */
export function relativeSeverityLabel(
  score: number | undefined,
  max: number,
  min: number
): string {
  if (score === undefined) return "no data";
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (score - min) / range));
  if (t >= 2 / 3) return "high severity";
  if (t >= 1 / 3) return "medium severity";
  return "low severity";
}

/**
 * Absolute severity bucket from a raw (possibly negative) z-score-based
 * composite score - see `components/SeverityBadge.tsx`. The composite
 * score can be negative, so bucket around 0 with a +/-1 threshold rather
 * than a raw-number or color-only encoding.
 */
export function severityLabel(score: number): "Low" | "Medium" | "High" {
  if (score >= 1) return "High";
  if (score <= -1) return "Low";
  return "Medium";
}

export const SEVERITY_BADGE_COLORS: Record<"High" | "Medium" | "Low", { bg: string; fg: string }> = {
  High: { bg: "#fee2e2", fg: "#991b1b" },
  Medium: { bg: "#fef3c7", fg: "#92400e" },
  Low: { bg: "#dcfce7", fg: "#166534" }
};

/** Re-exported so callers that only need the ramp don't have to import lib/theme directly. */
export { rampBlue };
