import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/impact - real actioned-hotspot list with before/after scores for
 * the Impact tracking screen (C6 of
 * .squad/task/redesign-dashboard-per-design-canvas.md). Backs
 * `lib/dashboardMetrics.ts`'s `computeImpactKpis`/`impactTrend`/
 * `impactActionsToCsv` - every field here is a real column from
 * `impact_actions`/`hotspot_scores`, joined the same way
 * `lib/impact.ts#getImpactComparison` already does for a single action.
 */
export async function GET() {
  const result = await query<{
    id: string;
    district: string;
    category: string;
    actioned_at: string;
    reengagement_recipient_count: number;
    pre_score: number | null;
    post_score: number | null;
  }>(
    `SELECT ia.id, ia.district, ia.category, ia.actioned_at, ia.reengagement_recipient_count,
            pre.composite_score AS pre_score, post.composite_score AS post_score
     FROM impact_actions ia
     LEFT JOIN hotspot_scores pre ON pre.id = ia.pre_action_hotspot_score_id
     LEFT JOIN hotspot_scores post ON post.id = ia.post_action_hotspot_score_id
     ORDER BY ia.actioned_at DESC`
  );

  const actions = result.rows.map((r) => ({
    id: r.id,
    district: r.district,
    category: r.category,
    actionedAt: r.actioned_at,
    preScore: r.pre_score,
    postScore: r.post_score,
    reengagementRecipientCount: r.reengagement_recipient_count
  }));

  return Response.json({ actions });
}
