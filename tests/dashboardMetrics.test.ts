import { describe, expect, it } from "vitest";
import type { HotspotRow } from "@/app/dashboard/types";
import {
  computeAlerts,
  computeComposition,
  computeImpactKpis,
  computeOverviewKpis,
  computeRecentActivity,
  formatCount,
  hotspotsToCsv,
  impactActionsToCsv,
  impactTrend,
  rankHotspotsDesc,
  topHotspots,
  type ImpactActionRow
} from "@/lib/dashboardMetrics";

/**
 * Fixture hotspots standing in for real `GET /api/hotspots` rows in this
 * unit test (C9: "KPI rendering against seeded data" without requiring a
 * live database) - shaped exactly like the real `HotspotRow` type the
 * dashboard fetches, not the design file's mock Bihar data.
 */
function makeHotspot(overrides: Partial<HotspotRow>): HotspotRow {
  return {
    id: "id-1",
    district: "Bangalore",
    category: "Roads",
    demand_volume: 1.2,
    demand_volume_raw: 40,
    infra_gap_score: 0.8,
    investment_offset: -0.3,
    composite_score: 1.5,
    submission_count: 40,
    duplicate_count: 2,
    is_actioned: false,
    actioned_at: null,
    computation_wave: "baseline",
    computed_at: "2026-09-12T04:10:00.000Z",
    ...overrides
  };
}

const FIXTURE: HotspotRow[] = [
  makeHotspot({ id: "h1", district: "Bangalore", category: "Roads", composite_score: 2.1 }),
  makeHotspot({
    id: "h2",
    district: "Mysore",
    category: "Water",
    composite_score: 1.2,
    is_actioned: true,
    actioned_at: "2026-08-01T00:00:00.000Z"
  }),
  makeHotspot({ id: "h3", district: "Mysore", category: "Health", composite_score: -1.4, submission_count: 5 }),
  makeHotspot({
    id: "h4",
    district: "Hassan",
    category: "Roads",
    composite_score: 1.6,
    computed_at: "2026-09-14T00:00:00.000Z"
  })
];

describe("formatCount", () => {
  it("keeps exact integers below 1000", () => {
    expect(formatCount(842)).toBe("842");
  });
  it("formats 1000+ with a 'k' suffix", () => {
    expect(formatCount(18412)).toBe("18.4k");
  });
});

describe("rankHotspotsDesc / topHotspots", () => {
  it("ranks by composite score descending without mutating the input", () => {
    const ranked = rankHotspotsDesc(FIXTURE);
    expect(ranked.map((h) => h.id)).toEqual(["h1", "h4", "h2", "h3"]);
    expect(FIXTURE[0].id).toBe("h1"); // original order untouched
  });

  it("returns the top N", () => {
    expect(topHotspots(FIXTURE, 2).map((h) => h.id)).toEqual(["h1", "h4"]);
  });
});

describe("computeOverviewKpis", () => {
  const kpis = computeOverviewKpis(FIXTURE);

  it("computes 'Active hotspots' as the real fetched count", () => {
    expect(kpis.find((k) => k.id === "active")?.value).toBe("4");
  });

  it("computes 'Unaddressed high severity' from the absolute severity bucket, excluding actioned rows", () => {
    // h1 (2.1, not actioned) and h4 (1.6, not actioned) are High and
    // unaddressed; h2 is High-range but actioned, so excluded; h3 is Low.
    expect(kpis.find((k) => k.id === "unaddressed-high")?.value).toBe("2");
  });

  it("sums real submission_count for 'Citizen requests fused'", () => {
    const total = FIXTURE.reduce((s, h) => s + h.submission_count, 0);
    expect(kpis.find((k) => k.id === "requests-fused")?.value).toBe(formatCount(total));
  });

  it("counts real is_actioned rows for 'Marked funded / actioned'", () => {
    expect(kpis.find((k) => k.id === "actioned")?.value).toBe("1");
  });

  it("never includes a fabricated trend delta field", () => {
    for (const k of kpis) {
      expect(Object.keys(k)).not.toContain("trend");
    }
  });
});

describe("computeComposition", () => {
  it("produces percentage segments that sum to ~100 for each row", () => {
    const rows = computeComposition(FIXTURE, 8);
    for (const r of rows) {
      expect(r.demandPct + r.gapPct + r.offsetPct).toBeCloseTo(100, 5);
    }
  });
});

describe("computeAlerts", () => {
  it("surfaces only unaddressed high-severity hotspots, sorted by score desc", () => {
    const alerts = computeAlerts(FIXTURE, 5);
    expect(alerts.map((a) => a.id)).toEqual(["h1", "h4"]);
    expect(alerts[0].text).toContain("Bangalore / Roads");
  });
});

describe("computeRecentActivity", () => {
  it("includes a real 'Scored' item for the most recent computed_at wave", () => {
    const activity = computeRecentActivity(FIXTURE, 6);
    const scored = activity.find((a) => a.tag === "Scored");
    expect(scored).toBeDefined();
    expect(scored?.when).toBe("2026-09-14T00:00:00.000Z");
  });

  it("includes a real 'Actioned' item for hotspots with actioned_at set", () => {
    const activity = computeRecentActivity(FIXTURE, 6);
    expect(activity.some((a) => a.id === "actioned-h2")).toBe(true);
  });
});

describe("hotspotsToCsv", () => {
  it("produces a header row plus one data row per hotspot", () => {
    const csv = hotspotsToCsv(FIXTURE);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(FIXTURE.length + 1);
    expect(lines[0]).toContain("District");
    expect(lines[1]).toContain("Bangalore");
  });

  it("escapes values containing commas", () => {
    const csv = hotspotsToCsv([makeHotspot({ district: "Bangalore, Rural" })]);
    expect(csv).toContain('"Bangalore, Rural"');
  });
});

const IMPACT_FIXTURE: ImpactActionRow[] = [
  {
    id: "a1",
    district: "Mysore",
    category: "Water",
    actionedAt: "2026-08-01T00:00:00.000Z",
    preScore: 2.0,
    postScore: 1.4,
    reengagementRecipientCount: 6
  },
  {
    id: "a2",
    district: "Hassan",
    category: "Roads",
    actionedAt: "2026-08-05T00:00:00.000Z",
    preScore: 1.8,
    postScore: 2.0,
    reengagementRecipientCount: 3
  },
  {
    id: "a3",
    district: "Tumkur",
    category: "Health",
    actionedAt: "2026-08-10T00:00:00.000Z",
    preScore: 1.1,
    postScore: null,
    reengagementRecipientCount: 0
  }
];

describe("computeImpactKpis", () => {
  it("always includes the real actioned count", () => {
    const kpis = computeImpactKpis(IMPACT_FIXTURE);
    expect(kpis.find((k) => k.id === "actioned-count")?.value).toBe("3");
  });

  it("computes average delta/share-improved only over rows with both scores", () => {
    const kpis = computeImpactKpis(IMPACT_FIXTURE);
    // a1: -0.6 (improved), a2: +0.2 (worsened); a3 excluded (no post score)
    const avg = kpis.find((k) => k.id === "avg-delta");
    expect(avg?.value).toBe("-0.20");
    expect(avg?.sub).toContain("2 of 3");
    const share = kpis.find((k) => k.id === "improved-share");
    expect(share?.value).toBe("50%");
  });

  it("omits avg-delta/improved-share entirely when no row has both scores", () => {
    const pendingOnly: ImpactActionRow[] = [
      { ...IMPACT_FIXTURE[2], postScore: null }
    ];
    const kpis = computeImpactKpis(pendingOnly);
    expect(kpis.find((k) => k.id === "avg-delta")).toBeUndefined();
    expect(kpis.find((k) => k.id === "improved-share")).toBeUndefined();
  });

  it("never claims a 'response rate' KPI (no real response-tracking signal exists)", () => {
    const kpis = computeImpactKpis(IMPACT_FIXTURE);
    expect(kpis.some((k) => k.label.toLowerCase().includes("response rate"))).toBe(false);
  });
});

describe("impactTrend", () => {
  it("labels a lower post score as Improving", () => {
    expect(impactTrend(IMPACT_FIXTURE[0])).toBe("Improving");
  });
  it("labels a higher post score as Worsening", () => {
    expect(impactTrend(IMPACT_FIXTURE[1])).toBe("Worsening");
  });
  it("labels a missing post score as Pending, not a fabricated Flat/Improving", () => {
    expect(impactTrend(IMPACT_FIXTURE[2])).toBe("Pending");
  });
});

describe("impactActionsToCsv", () => {
  it("produces one row per action with a header", () => {
    const csv = impactActionsToCsv(IMPACT_FIXTURE);
    expect(csv.split("\n")).toHaveLength(IMPACT_FIXTURE.length + 1);
  });
});
