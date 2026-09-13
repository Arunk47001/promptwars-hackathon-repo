import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/hotspots/:id - hotspot detail + drill-down into its underlying
 * anonymized citizen requests (C13's "drill-down detail panel").
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const hotspotResult = await query(
    `SELECT id, district, category, demand_volume, demand_volume_raw, infra_gap_score,
            investment_offset, composite_score, submission_count, duplicate_count,
            is_actioned, actioned_at, computation_wave, computed_at
     FROM hotspot_scores WHERE id = $1`,
    [params.id]
  );
  const hotspot = hotspotResult.rows[0];
  if (!hotspot) {
    return Response.json({ error: "hotspot not found" }, { status: 404 });
  }

  const submissionsResult = await query(
    `SELECT id, created_at, channel, category, description, urgency, sentiment,
            state, district, block, village, is_likely_duplicate, is_burst_flagged,
            score_weight, extraction_path
     FROM clean_submissions
     WHERE district = $1 AND category = $2
     ORDER BY created_at DESC
     LIMIT 100`,
    [hotspot.district, hotspot.category]
  );

  return Response.json({ hotspot, submissions: submissionsResult.rows });
}
