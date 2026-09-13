import { query } from "@/lib/db";
import { computeAndPersistHotspotScores } from "@/lib/scoring";

export const runtime = "nodejs";

/** GET /api/hotspots?wave=baseline - ranked hotspot list for the dashboard (C13). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wave = searchParams.get("wave") ?? "baseline";

  const result = await query(
    `SELECT id, district, category, demand_volume, demand_volume_raw, infra_gap_score,
            investment_offset, composite_score, submission_count, duplicate_count,
            is_actioned, actioned_at, computation_wave, computed_at
     FROM hotspot_scores
     WHERE computation_wave = $1
     ORDER BY composite_score DESC`,
    [wave]
  );

  return Response.json({ wave, hotspots: result.rows });
}

/** POST /api/hotspots/compute-equivalent: recompute the baseline scoring wave. */
export async function POST(request: Request) {
  let wave = "baseline";
  try {
    const body = await request.json();
    if (body?.wave) wave = body.wave;
  } catch {
    // no body -> default baseline wave
  }
  const scored = await computeAndPersistHotspotScores(wave);
  return Response.json({ wave, count: scored.length, hotspots: scored });
}
