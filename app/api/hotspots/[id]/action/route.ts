import {
  markHotspotActioned,
  triggerReengagement,
  recomputePostActionScore,
  getImpactComparison
} from "@/lib/impact";

export const runtime = "nodejs";

/**
 * POST /api/hotspots/:id/action - impact-tracking "mark as funded/actioned"
 * control (C12). Body: { actionedBy?: string, note?: string,
 * triggerReengagement?: boolean, recomputeScore?: boolean }.
 *
 * By default also triggers re-engagement and recomputes the post-action
 * score so a single dashboard button click produces the full before/after
 * comparison the acceptance criteria asks for; both can be disabled via
 * the body flags for a two-step UI instead.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: {
    actionedBy?: string;
    note?: string;
    triggerReengagement?: boolean;
    recomputeScore?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    // no body -> use defaults
  }

  try {
    const { impactActionId, district, category } = await markHotspotActioned(
      params.id,
      body.actionedBy ?? "dashboard-user",
      body.note
    );

    let reengagement: { recipientCount: number; message: string } | undefined;
    if (body.triggerReengagement !== false) {
      reengagement = await triggerReengagement(impactActionId);
    }

    if (body.recomputeScore !== false) {
      await recomputePostActionScore(impactActionId);
    }

    const comparison = await getImpactComparison(impactActionId);

    return Response.json({
      impactActionId,
      district,
      category,
      reengagement,
      comparison
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`mark-as-actioned failed for hotspot ${params.id}:`, message);
    return Response.json({ error: message }, { status: 400 });
  }
}
