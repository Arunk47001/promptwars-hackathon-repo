import { query } from "@/lib/db";
import { generateHotspotRationale } from "@/lib/gemini";

export const runtime = "nodejs";

/**
 * POST /api/hotspots/:id/rationale - Gemini 2.5 Pro hotspot rationale
 * generation (C11). Caches the result in hotspot_rationales so repeat
 * dashboard loads don't re-call the model.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const hotspotResult = await query<{
    id: string;
    district: string;
    category: string;
    demand_volume: number;
    infra_gap_score: number;
    investment_offset: number;
    composite_score: number;
    submission_count: number;
    duplicate_count: number;
    computation_wave: string;
  }>(
    `SELECT id, district, category, demand_volume, infra_gap_score, investment_offset,
            composite_score, submission_count, duplicate_count, computation_wave
     FROM hotspot_scores WHERE id = $1`,
    [params.id]
  );
  const hotspot = hotspotResult.rows[0];
  if (!hotspot) {
    return Response.json({ error: "hotspot not found" }, { status: 404 });
  }

  const cached = await query<{ rationale_text: string; generated_at: Date; model: string }>(
    `SELECT rationale_text, generated_at, model FROM hotspot_rationales
     WHERE hotspot_score_id = $1 ORDER BY generated_at DESC LIMIT 1`,
    [hotspot.id]
  );
  if (cached.rows[0]) {
    return Response.json({ rationale: cached.rows[0].rationale_text, cached: true });
  }

  const rankResult = await query<{ rank: string; total: string }>(
    `SELECT
       (SELECT count(*) + 1 FROM hotspot_scores
        WHERE computation_wave = $2 AND composite_score > (SELECT composite_score FROM hotspot_scores WHERE id = $1)) AS rank,
       (SELECT count(*) FROM hotspot_scores WHERE computation_wave = $2) AS total`,
    [hotspot.id, hotspot.computation_wave]
  );
  const rank = Number(rankResult.rows[0]?.rank ?? 1);
  const total = Number(rankResult.rows[0]?.total ?? 1);

  try {
    const rationaleText = await generateHotspotRationale({
      district: hotspot.district,
      category: hotspot.category,
      submissionCount: hotspot.submission_count,
      duplicateCount: hotspot.duplicate_count,
      demandVolumeZ: hotspot.demand_volume,
      infraGapZ: hotspot.infra_gap_score,
      investmentOffsetZ: hotspot.investment_offset,
      compositeScore: hotspot.composite_score,
      rank,
      totalRanked: total
    });

    const model = process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro";
    await query(
      `INSERT INTO hotspot_rationales (hotspot_score_id, model, rationale_text)
       VALUES ($1,$2,$3)`,
      [hotspot.id, model, rationaleText]
    );

    return Response.json({ rationale: rationaleText, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`rationale generation failed for hotspot ${hotspot.id}:`, message);
    return Response.json({ error: message }, { status: 502 });
  }
}
