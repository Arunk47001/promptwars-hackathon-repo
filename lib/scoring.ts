import { query } from "./db";

/**
 * Hotspot / fusion scoring engine (C10).
 *
 * The join/aggregation itself is SQL (see `fetchRawHotspotInputs` below):
 * clean_submissions joined with ref_demographics / ref_infrastructure /
 * ref_investment on `district`, grouped by district+category. The
 * z-scoring/composite math is kept as a small, independently unit-testable
 * pure function (`computeHotspotScores`) so each component (demand,
 * infra-gap, investment offset) is inspectable on its own, not just the
 * final composite score, per the task's acceptance criteria.
 */

export interface RawHotspotInput {
  district: string;
  category: string;
  /** Sum of score_weight across all (incl. duplicate-flagged) submissions. */
  weightedDemandRaw: number;
  submissionCount: number;
  duplicateCount: number;
  /**
   * Higher = worse infrastructure (i.e. a deficit score derived from
   * 100 - average of the NFHS-5 access percentages). Missing reference
   * data yields 0 (neutral), not a crash.
   */
  infraGapRaw: number;
  /**
   * Existing planned/budgeted investment signal (higher = more already
   * planned/invested, which should reduce a district+category's ranking).
   */
  investmentRaw: number;
}

export interface HotspotScoreResult extends RawHotspotInput {
  demandVolumeZ: number;
  infraGapZ: number;
  investmentOffsetZ: number;
  compositeScore: number;
}

function zScores(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) {
    // No variation across the set: everyone is equally "average" -> 0,
    // rather than dividing by zero / producing NaN.
    return values.map(() => 0);
  }
  return values.map((v) => (v - mean) / stdDev);
}

/**
 * Weights are named constants (not magic numbers) so the formula stays
 * transparent/explainable per the plan's "no ML-forward alternative"
 * decision. Demand and infra-gap push a district+sector's score up;
 * existing investment pulls it down.
 */
export const SCORING_WEIGHTS = {
  demand: 1.0,
  infraGap: 1.0,
  investmentOffset: 1.0
};

export function computeHotspotScores(
  inputs: RawHotspotInput[]
): HotspotScoreResult[] {
  const demandZ = zScores(inputs.map((i) => i.weightedDemandRaw));
  const infraZ = zScores(inputs.map((i) => i.infraGapRaw));
  const investmentZ = zScores(inputs.map((i) => i.investmentRaw));

  return inputs.map((input, i) => {
    const demandVolumeZ = demandZ[i];
    const infraGapZ = infraZ[i];
    const investmentOffsetZ = investmentZ[i];
    const compositeScore =
      SCORING_WEIGHTS.demand * demandVolumeZ +
      SCORING_WEIGHTS.infraGap * infraGapZ -
      SCORING_WEIGHTS.investmentOffset * investmentOffsetZ;

    return {
      ...input,
      demandVolumeZ,
      infraGapZ,
      investmentOffsetZ,
      compositeScore
    };
  });
}

export function rankHotspots(
  scored: HotspotScoreResult[]
): HotspotScoreResult[] {
  return [...scored].sort((a, b) => b.compositeScore - a.compositeScore);
}

/** Fetches the raw joined/aggregated inputs from Postgres. */
export async function fetchRawHotspotInputs(): Promise<RawHotspotInput[]> {
  const result = await query<{
    district: string;
    category: string;
    weighted_demand_raw: string;
    submission_count: string;
    duplicate_count: string;
    infra_gap_raw: string | null;
    investment_raw: string | null;
  }>(`
    SELECT
      cs.district,
      cs.category,
      SUM(cs.score_weight) AS weighted_demand_raw,
      COUNT(*) AS submission_count,
      COUNT(*) FILTER (WHERE cs.is_likely_duplicate) AS duplicate_count,
      COALESCE(
        100 - (
          COALESCE(ri.households_with_electricity_pct, 50) +
          COALESCE(ri.households_with_improved_water_pct, 50) +
          COALESCE(ri.households_with_improved_sanitation_pct, 50) +
          COALESCE(ri.households_near_health_facility_pct, 50)
        ) / 4.0,
        0
      ) AS infra_gap_raw,
      COALESCE(rinv.pmgsy_investment_sanctioned_lakh_rupees, 0) AS investment_raw
    FROM clean_submissions cs
    LEFT JOIN ref_infrastructure ri ON ri.district = cs.district
    LEFT JOIN ref_investment rinv ON rinv.district = cs.district
    GROUP BY cs.district, cs.category, ri.households_with_electricity_pct,
      ri.households_with_improved_water_pct, ri.households_with_improved_sanitation_pct,
      ri.households_near_health_facility_pct, rinv.pmgsy_investment_sanctioned_lakh_rupees
  `);

  return result.rows.map((r) => ({
    district: r.district,
    category: r.category,
    weightedDemandRaw: Number(r.weighted_demand_raw),
    submissionCount: Number(r.submission_count),
    duplicateCount: Number(r.duplicate_count),
    infraGapRaw: Number(r.infra_gap_raw ?? 0),
    investmentRaw: Number(r.investment_raw ?? 0)
  }));
}

export async function computeAndPersistHotspotScores(
  computationWave: string = "baseline"
): Promise<HotspotScoreResult[]> {
  const rawInputs = await fetchRawHotspotInputs();
  const scored = rankHotspots(computeHotspotScores(rawInputs));

  for (const s of scored) {
    await query(
      `INSERT INTO hotspot_scores
        (district, category, demand_volume, demand_volume_raw, infra_gap_score,
         investment_offset, composite_score, submission_count, duplicate_count,
         computation_wave)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        s.district,
        s.category,
        s.demandVolumeZ,
        s.weightedDemandRaw,
        s.infraGapZ,
        s.investmentOffsetZ,
        s.compositeScore,
        s.submissionCount,
        s.duplicateCount,
        computationWave
      ]
    );
  }

  return scored;
}
