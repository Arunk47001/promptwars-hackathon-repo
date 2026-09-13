import { describe, expect, it } from "vitest";
import { computeHotspotScores, rankHotspots, type RawHotspotInput } from "@/lib/scoring";

describe("computeHotspotScores", () => {
  it("produces an inspectable component score for each of demand/infra-gap/investment, not just the composite", () => {
    const inputs: RawHotspotInput[] = [
      {
        district: "Patna",
        category: "water",
        weightedDemandRaw: 10,
        submissionCount: 10,
        duplicateCount: 0,
        infraGapRaw: 20,
        investmentRaw: 5
      },
      {
        district: "Gaya",
        category: "water",
        weightedDemandRaw: 2,
        submissionCount: 2,
        duplicateCount: 0,
        infraGapRaw: 5,
        investmentRaw: 50
      }
    ];

    const scored = computeHotspotScores(inputs);
    expect(scored).toHaveLength(2);
    for (const row of scored) {
      expect(typeof row.demandVolumeZ).toBe("number");
      expect(typeof row.infraGapZ).toBe("number");
      expect(typeof row.investmentOffsetZ).toBe("number");
      expect(typeof row.compositeScore).toBe("number");
    }
  });

  it("ranks a district with high demand + high infra-gap + low investment above one with the opposite profile", () => {
    const inputs: RawHotspotInput[] = [
      {
        district: "HighNeed",
        category: "roads",
        weightedDemandRaw: 50,
        submissionCount: 50,
        duplicateCount: 0,
        infraGapRaw: 80,
        investmentRaw: 1
      },
      {
        district: "LowNeed",
        category: "roads",
        weightedDemandRaw: 1,
        submissionCount: 1,
        duplicateCount: 0,
        infraGapRaw: 5,
        investmentRaw: 100
      }
    ];

    const ranked = rankHotspots(computeHotspotScores(inputs));
    expect(ranked[0].district).toBe("HighNeed");
    expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore);
  });

  it("down-weights duplicate-flagged submissions so they visibly count less in the demand signal", () => {
    // Same raw submission count, but one district's count is mostly
    // duplicate-down-weighted (lower weightedDemandRaw as a result of the
    // spam module's score_weight), the other is all confirmed.
    const inputs: RawHotspotInput[] = [
      {
        district: "MostlyDuplicates",
        category: "electricity",
        weightedDemandRaw: 2.5, // 10 submissions at 0.25 weight each
        submissionCount: 10,
        duplicateCount: 10,
        infraGapRaw: 30,
        investmentRaw: 10
      },
      {
        district: "AllConfirmed",
        category: "electricity",
        weightedDemandRaw: 10, // 10 submissions at full weight
        submissionCount: 10,
        duplicateCount: 0,
        infraGapRaw: 30,
        investmentRaw: 10
      }
    ];

    const scored = computeHotspotScores(inputs);
    const mostlyDup = scored.find((s) => s.district === "MostlyDuplicates")!;
    const allConfirmed = scored.find((s) => s.district === "AllConfirmed")!;
    expect(mostlyDup.demandVolumeZ).toBeLessThan(allConfirmed.demandVolumeZ);
  });

  it("handles a missing/edge-case district gracefully (no NaN from zero variance)", () => {
    const inputs: RawHotspotInput[] = [
      {
        district: "OnlyOne",
        category: "health",
        weightedDemandRaw: 5,
        submissionCount: 5,
        duplicateCount: 0,
        infraGapRaw: 10,
        investmentRaw: 0
      }
    ];
    const scored = computeHotspotScores(inputs);
    expect(scored[0].demandVolumeZ).toBe(0);
    expect(Number.isNaN(scored[0].compositeScore)).toBe(false);
  });

  it("returns an empty array for empty input without throwing", () => {
    expect(computeHotspotScores([])).toEqual([]);
  });
});
