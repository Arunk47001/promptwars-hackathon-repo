import { query } from "./db";
import { ingestSubmission } from "./intake";
import { computeAndPersistHotspotScores, type HotspotScoreResult } from "./scoring";

/**
 * Impact-tracking module (C12): "mark hotspot as funded/actioned",
 * re-engagement (simulated follow-up submissions through the same
 * intake->processing->scoring pipeline), and before/after score
 * recomputation for the same district+category.
 */

export interface HotspotScoreRow {
  id: string;
  district: string;
  category: string;
  composite_score: number;
  computation_wave: string;
  computed_at: Date;
}

async function getHotspotScoreById(id: string): Promise<HotspotScoreRow | null> {
  const result = await query<HotspotScoreRow>(
    `SELECT id, district, category, composite_score, computation_wave, computed_at
     FROM hotspot_scores WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function markHotspotActioned(
  hotspotScoreId: string,
  actionedBy: string,
  note?: string
): Promise<{ impactActionId: string; district: string; category: string }> {
  const hotspot = await getHotspotScoreById(hotspotScoreId);
  if (!hotspot) {
    throw new Error(`Hotspot score ${hotspotScoreId} not found`);
  }

  await query(
    `UPDATE hotspot_scores SET is_actioned = true, actioned_at = now() WHERE id = $1`,
    [hotspotScoreId]
  );

  const insertResult = await query<{ id: string }>(
    `INSERT INTO impact_actions
       (district, category, actioned_by, note, pre_action_hotspot_score_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [hotspot.district, hotspot.category, actionedBy, note ?? null, hotspotScoreId]
  );

  return {
    impactActionId: insertResult.rows[0].id,
    district: hotspot.district,
    category: hotspot.category
  };
}

const REENGAGEMENT_MESSAGE_TEMPLATE = (district: string, category: string) =>
  `Follow-up from the citizen infrastructure platform: you previously reported a "${category}" issue in ${district}. Has this improved since it was marked as funded/actioned? Reply with your update.`;

/**
 * Simulated re-engagement: looks up citizens (by their restricted,
 * intake-only plaintext phone number - never exposed outside this
 * function) who reported in the actioned district+category, and pushes a
 * new simulated inbound submission for each through the *same*
 * intake -> queue -> worker -> clean_submissions pipeline used for real
 * citizen-initiated submissions, tagged so the resulting clean record
 * links back to the original wave (reengagement_of_district/category).
 *
 * In a live deployment this would instead be a real outbound Twilio
 * SMS/WhatsApp prompt followed by waiting for citizens' real replies to
 * arrive via the normal webhooks; simulating the reply side inline here
 * keeps the demo self-contained and runnable without live Twilio credits,
 * per the plan's "simulated or real" framing for this feature.
 */
export async function triggerReengagement(
  impactActionId: string,
  simulatedReplyText: string = "Yes, it has improved. Thank you."
): Promise<{ recipientCount: number; message: string }> {
  const actionResult = await query<{ district: string; category: string }>(
    `SELECT district, category FROM impact_actions WHERE id = $1`,
    [impactActionId]
  );
  const action = actionResult.rows[0];
  if (!action) {
    throw new Error(`Impact action ${impactActionId} not found`);
  }

  const recipientsResult = await query<{ phone_plaintext: string }>(
    `SELECT DISTINCT i.phone_plaintext
     FROM clean_submissions cs
     JOIN intake_submissions i ON i.id = cs.intake_id
     WHERE cs.district = $1 AND cs.category = $2`,
    [action.district, action.category]
  );

  const message = REENGAGEMENT_MESSAGE_TEMPLATE(action.district, action.category);

  for (const recipient of recipientsResult.rows) {
    await ingestSubmission({
      channel: "sms",
      phoneNumber: recipient.phone_plaintext,
      rawPayload: {
        Body: simulatedReplyText,
        From: recipient.phone_plaintext,
        _reengagement: { district: action.district, category: action.category }
      },
      rawText: simulatedReplyText
    });
  }

  await query(
    `UPDATE impact_actions
     SET reengagement_triggered_at = now(), reengagement_message = $2, reengagement_recipient_count = $3
     WHERE id = $1`,
    [impactActionId, message, recipientsResult.rows.length]
  );

  return { recipientCount: recipientsResult.rows.length, message };
}

/**
 * Recomputes hotspot scores as a new "post-action" wave and links the
 * resulting district+category score row to the impact_actions record, so
 * the dashboard can display pre-action vs. post-action scores side by
 * side for the same district+category (C12 acceptance criterion).
 */
export async function recomputePostActionScore(
  impactActionId: string
): Promise<HotspotScoreResult | null> {
  const actionResult = await query<{ district: string; category: string }>(
    `SELECT district, category FROM impact_actions WHERE id = $1`,
    [impactActionId]
  );
  const action = actionResult.rows[0];
  if (!action) {
    throw new Error(`Impact action ${impactActionId} not found`);
  }

  const wave = `post-action-${impactActionId}`;
  const scored = await computeAndPersistHotspotScores(wave);
  const match = scored.find(
    (s) => s.district === action.district && s.category === action.category
  );

  if (match) {
    const rowResult = await query<{ id: string }>(
      `SELECT id FROM hotspot_scores
       WHERE district = $1 AND category = $2 AND computation_wave = $3
       ORDER BY computed_at DESC LIMIT 1`,
      [action.district, action.category, wave]
    );
    const scoreRowId = rowResult.rows[0]?.id;
    if (scoreRowId) {
      await query(
        `UPDATE impact_actions SET post_action_hotspot_score_id = $2 WHERE id = $1`,
        [impactActionId, scoreRowId]
      );
    }
  }

  return match ?? null;
}

export interface ImpactComparison {
  district: string;
  category: string;
  actionedAt: Date | null;
  preActionScore: number | null;
  postActionScore: number | null;
  reengagementRecipientCount: number;
}

export async function getImpactComparison(
  impactActionId: string
): Promise<ImpactComparison | null> {
  const result = await query<{
    district: string;
    category: string;
    actioned_at: Date;
    reengagement_recipient_count: number;
    pre_score: number | null;
    post_score: number | null;
  }>(
    `SELECT ia.district, ia.category, ia.actioned_at, ia.reengagement_recipient_count,
            pre.composite_score AS pre_score, post.composite_score AS post_score
     FROM impact_actions ia
     LEFT JOIN hotspot_scores pre ON pre.id = ia.pre_action_hotspot_score_id
     LEFT JOIN hotspot_scores post ON post.id = ia.post_action_hotspot_score_id
     WHERE ia.id = $1`,
    [impactActionId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    district: row.district,
    category: row.category,
    actionedAt: row.actioned_at,
    preActionScore: row.pre_score,
    postActionScore: row.post_score,
    reengagementRecipientCount: row.reengagement_recipient_count
  };
}
