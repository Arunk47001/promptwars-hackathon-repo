import type { HotspotRow } from "@/app/dashboard/types";
import { severityLabel } from "./colorScale";

/**
 * Pure, DB-free helpers backing the redesigned dashboard's Overview,
 * Hotspot explorer, and Impact tracking screens (C3/C4/C6/C8 of
 * .squad/task/redesign-dashboard-per-design-canvas.md).
 *
 * Kept separate from the API routes/React components specifically so they
 * are unit-testable against fixture data without a live database (C9) -
 * every number they produce is a real computation over whatever
 * `HotspotRow[]`/`ImpactActionRow[]` the caller fetched from the real API
 * routes, never a fabricated/mock value.
 */

export interface OverviewKpi {
  id: string;
  label: string;
  value: string;
  sub: string;
}

/** Formats a count with a "k" suffix above 1000, e.g. 18412 -> "18.4k". Below 1000, returns the exact integer (never a misleadingly-rounded "k" for small real counts). */
export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export function rankHotspotsDesc(hotspots: HotspotRow[]): HotspotRow[] {
  return [...hotspots].sort((a, b) => b.composite_score - a.composite_score);
}

export function topHotspots(hotspots: HotspotRow[], n = 5): HotspotRow[] {
  return rankHotspotsDesc(hotspots).slice(0, n);
}

/**
 * Overview KPI cards (C3). Every value is computed from the real
 * `HotspotRow[]` the caller already fetched from `GET /api/hotspots` - no
 * trend/delta figures are shown, because there is no real stored
 * wave-over-wave history to compute a period-over-period trend from (the
 * design's "+9"/"+4" style trend chips are illustrative mock deltas, not
 * something this schema can currently back honestly - see the coder status
 * report for this disclosed gap).
 */
export function computeOverviewKpis(hotspots: HotspotRow[]): OverviewKpi[] {
  const districts = new Set(hotspots.map((h) => h.district)).size;
  const categories = new Set(hotspots.map((h) => h.category)).size;
  const unaddressedHigh = hotspots.filter(
    (h) => severityLabel(h.composite_score) === "High" && !h.is_actioned
  ).length;
  const requestsFused = hotspots.reduce((sum, h) => sum + (h.submission_count ?? 0), 0);
  const actioned = hotspots.filter((h) => h.is_actioned).length;

  return [
    {
      id: "active",
      label: "Active hotspots",
      value: String(hotspots.length),
      sub: `${districts} district${districts === 1 ? "" : "s"}, ${categories} categor${categories === 1 ? "y" : "ies"}`
    },
    {
      id: "unaddressed-high",
      label: "Unaddressed high severity",
      value: String(unaddressedHigh),
      sub: "composite score ≥ 1 (z-score), not yet funded"
    },
    {
      id: "requests-fused",
      label: "Citizen requests fused",
      value: formatCount(requestsFused),
      sub: "current scoring wave, voice/SMS/messaging intake"
    },
    {
      id: "actioned",
      label: "Marked funded / actioned",
      value: String(actioned),
      sub: "tracked on Impact tracking"
    }
  ];
}

/** Score-composition rows for the top-N hotspots (C4's restyled "Score composition" chart). */
export interface CompositionRow {
  id: string;
  district: string;
  category: string;
  score: string;
  demandPct: number;
  gapPct: number;
  offsetPct: number;
}

export function computeComposition(hotspots: HotspotRow[], n = 8): CompositionRow[] {
  return rankHotspotsDesc(hotspots)
    .slice(0, n)
    .map((h) => {
      const demand = Math.abs(h.demand_volume);
      const gap = Math.abs(h.infra_gap_score);
      const offset = Math.abs(h.investment_offset);
      const total = demand + gap + offset;
      const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
      return {
        id: h.id,
        district: h.district,
        category: h.category,
        score: h.composite_score.toFixed(2),
        demandPct: pct(demand),
        gapPct: pct(gap),
        offsetPct: pct(offset)
      };
    });
}

// ---------------------------------------------------------------------
// CSV export (C8)
// ---------------------------------------------------------------------

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HOTSPOT_CSV_COLUMNS: Array<{ key: keyof HotspotRow; header: string }> = [
  { key: "district", header: "District" },
  { key: "category", header: "Category" },
  { key: "composite_score", header: "Composite score" },
  { key: "demand_volume", header: "Demand (z)" },
  { key: "infra_gap_score", header: "Infra gap (z)" },
  { key: "investment_offset", header: "Investment offset (z)" },
  { key: "submission_count", header: "Submissions" },
  { key: "duplicate_count", header: "Duplicates" },
  { key: "is_actioned", header: "Actioned" },
  { key: "computation_wave", header: "Computation wave" },
  { key: "computed_at", header: "Computed at" }
];

/** Builds a real CSV (one row per hotspot) from whatever rows are passed in - the caller is responsible for passing the currently-filtered set for "Current filtered view" scope, or the full fetched set for "Full region" scope. */
export function hotspotsToCsv(hotspots: HotspotRow[]): string {
  const header = HOTSPOT_CSV_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const lines = hotspots.map((h) =>
    HOTSPOT_CSV_COLUMNS.map((c) => csvEscape(String(h[c.key] ?? ""))).join(",")
  );
  return [header, ...lines].join("\n");
}

// ---------------------------------------------------------------------
// Impact tracking (C6)
// ---------------------------------------------------------------------

export interface ImpactActionRow {
  id: string;
  district: string;
  category: string;
  actionedAt: string;
  preScore: number | null;
  postScore: number | null;
  reengagementRecipientCount: number;
}

export interface ImpactKpi {
  id: string;
  label: string;
  value: string;
  sub: string;
}

/**
 * Impact-tracking portfolio KPIs (C6). Only includes a KPI when it has a
 * real, computable definition from `impact_actions`/`hotspot_scores`:
 *
 * - "Projects marked funded/actioned" - always computable (count of rows).
 * - "Average composite score change" / "Share with improved score" - only
 *   computed over actions that actually have *both* a pre- and a
 *   recomputed post-action score (recompute can fail/not have been run
 *   yet); omitted entirely if none do, rather than showing "0" or "n/a"
 *   as if it were a real zero.
 * - The design's "Citizen re-engagement response rate" KPI is
 *   intentionally NOT reproduced here: `impact_actions` only stores how
 *   many citizens were *sent* a re-engagement prompt
 *   (`reengagement_recipient_count`), not whether/how they replied - there
 *   is no real "response rate" signal in the schema to compute it from
 *   honestly (see the coder status report for this disclosed gap).
 */
export function computeImpactKpis(actions: ImpactActionRow[]): ImpactKpi[] {
  const kpis: ImpactKpi[] = [
    {
      id: "actioned-count",
      label: "Projects marked funded / actioned",
      value: String(actions.length),
      sub: "recorded in impact_actions"
    }
  ];

  const withBoth = actions.filter((a) => a.preScore !== null && a.postScore !== null) as Array<
    ImpactActionRow & { preScore: number; postScore: number }
  >;

  if (withBoth.length > 0) {
    const avgDelta =
      withBoth.reduce((sum, a) => sum + (a.postScore - a.preScore), 0) / withBoth.length;
    const improved = withBoth.filter((a) => a.postScore < a.preScore).length;

    kpis.push({
      id: "avg-delta",
      label: "Average composite score change",
      value: (avgDelta >= 0 ? "+" : "") + avgDelta.toFixed(2),
      sub: `since action date, ${withBoth.length} of ${actions.length} with a recomputed post-action score`
    });
    kpis.push({
      id: "improved-share",
      label: "Share with improved (lower) score",
      value: `${Math.round((improved / withBoth.length) * 100)}%`,
      sub: `${improved} of ${withBoth.length} recomputed projects`
    });
  }

  const totalRecipients = actions.reduce((s, a) => s + (a.reengagementRecipientCount ?? 0), 0);
  kpis.push({
    id: "reengagement-sent",
    label: "Re-engagement prompts sent",
    value: String(totalRecipients),
    sub: "citizens re-contacted after funding (response tracking not yet built)"
  });

  return kpis;
}

// ---------------------------------------------------------------------
// Alerts + recent activity (C2/C3) - both derived purely from the same
// HotspotRow[] the dashboard already fetches, never fabricated events.
// ---------------------------------------------------------------------

export interface AlertItem {
  id: string;
  text: string;
  when: string;
  severity: "high" | "info";
}

/**
 * Header "Alerts" bell contents (C2). The design's 3 example alerts
 * include a "PMGSY feed is stale — 104 days" item; this schema has no
 * per-source last-refreshed timestamp column (`ref_investment` has no
 * `updated_at`), so a real staleness alert cannot be computed honestly and
 * is intentionally omitted (see status report). What *is* real and
 * computable: every unaddressed high-severity hotspot, which is exactly
 * the kind of thing a policymaker would want surfaced as an alert.
 */
export function computeAlerts(hotspots: HotspotRow[], limit = 5): AlertItem[] {
  return hotspots
    .filter((h) => severityLabel(h.composite_score) === "High" && !h.is_actioned)
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, limit)
    .map((h) => ({
      id: h.id,
      text: `Unaddressed high-severity: ${h.district} / ${h.category} (score ${h.composite_score.toFixed(2)})`,
      when: h.computed_at,
      severity: "high" as const
    }));
}

export interface ActivityItem {
  id: string;
  when: string;
  text: string;
  tag: "Actioned" | "Scored";
}

/**
 * Overview "Recent activity" feed (C3). Only two event types have real
 * backing data in the current schema:
 * - "Actioned": hotspots with `is_actioned`/`actioned_at` set (real).
 * - "Scored": the most recent `computed_at` timestamp/wave among the
 *   fetched hotspots (real - there is no per-recompute event log table,
 *   so this shows the latest score snapshot rather than a full history of
 *   every past recompute).
 * The design's "New hotspot entered top 3" and "burst detection grouped N
 * submissions" event types have no equivalent stored event to read back,
 * so they are omitted rather than invented (see status report).
 */
export function computeRecentActivity(hotspots: HotspotRow[], limit = 6): ActivityItem[] {
  const actionedItems: ActivityItem[] = hotspots
    .filter((h): h is HotspotRow & { actioned_at: string } => h.is_actioned && !!h.actioned_at)
    .sort((a, b) => new Date(b.actioned_at).getTime() - new Date(a.actioned_at).getTime())
    .slice(0, limit)
    .map((h) => ({
      id: `actioned-${h.id}`,
      when: h.actioned_at,
      text: `${h.district} / ${h.category} marked funded / actioned`,
      tag: "Actioned" as const
    }));

  let scoredItem: ActivityItem | null = null;
  if (hotspots.length > 0) {
    const latest = hotspots.reduce((max, h) =>
      new Date(h.computed_at).getTime() > new Date(max.computed_at).getTime() ? h : max
    );
    scoredItem = {
      id: `scored-${latest.computation_wave}-${latest.computed_at}`,
      when: latest.computed_at,
      text: `Hotspot scores computed (wave: ${latest.computation_wave}, ${hotspots.length} rows)`,
      tag: "Scored"
    };
  }

  const items = scoredItem ? [scoredItem, ...actionedItems] : actionedItems;
  return items
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, limit);
}

export type ImpactTrend = "Improving" | "Worsening" | "Flat" | "Pending";

export function impactTrend(a: ImpactActionRow): ImpactTrend {
  if (a.preScore === null || a.postScore === null) return "Pending";
  const delta = a.postScore - a.preScore;
  if (Math.abs(delta) < 0.01) return "Flat";
  return delta < 0 ? "Improving" : "Worsening";
}

const IMPACT_CSV_COLUMNS: Array<{ header: string; get: (a: ImpactActionRow) => string }> = [
  { header: "District", get: (a) => a.district },
  { header: "Category", get: (a) => a.category },
  { header: "Action date", get: (a) => a.actionedAt },
  { header: "Before (composite)", get: (a) => (a.preScore ?? "").toString() },
  { header: "Latest (composite)", get: (a) => (a.postScore ?? "").toString() },
  { header: "Trend", get: (a) => impactTrend(a) },
  { header: "Re-engagement recipients", get: (a) => String(a.reengagementRecipientCount) }
];

export function impactActionsToCsv(actions: ImpactActionRow[]): string {
  const header = IMPACT_CSV_COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const lines = actions.map((a) => IMPACT_CSV_COLUMNS.map((c) => csvEscape(c.get(a))).join(","));
  return [header, ...lines].join("\n");
}
