import { query } from "./db";
import { hashPhoneNumber } from "./anonymize";
import { getQueue } from "./queue";
import { DEFAULT_RATE_LIMIT, isRateLimited } from "./spam";

export interface IncomingSubmission {
  channel: "voice" | "sms" | "whatsapp";
  phoneNumber: string;
  rawPayload: Record<string, unknown>;
  audioUrl?: string;
  rawText?: string;
  preciseLat?: number;
  preciseLng?: number;
}

export interface IntakeResult {
  intakeId: string;
  rateLimited: boolean;
  queueJobId?: string;
}

/**
 * Shared webhook-layer intake handler (C5 + rate-limiting half of C9):
 * hashes the phone number, checks the per-hour rate limit against recent
 * submissions from the same hashed number, persists the raw record to the
 * restricted intake table, and (if not rate-limited) enqueues an async
 * processing job. Always acks fast - no Gemini/heavy processing happens on
 * this path.
 */
export async function ingestSubmission(
  input: IncomingSubmission
): Promise<IntakeResult> {
  const phoneHash = hashPhoneNumber(input.phoneNumber);

  const recentResult = await query<{ received_at: Date }>(
    `SELECT received_at FROM intake_submissions
     WHERE phone_hash = $1 AND received_at >= now() - interval '1 hour'`,
    [phoneHash]
  );
  const recentTimestampsMs = recentResult.rows.map((r) =>
    new Date(r.received_at).getTime()
  );
  const rateLimited = isRateLimited(recentTimestampsMs, Date.now(), DEFAULT_RATE_LIMIT);

  const insertResult = await query<{ id: string }>(
    `INSERT INTO intake_submissions
       (channel, phone_plaintext, phone_hash, raw_payload, audio_url, raw_text,
        precise_lat, precise_lng, processing_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      input.channel,
      input.phoneNumber,
      phoneHash,
      JSON.stringify(input.rawPayload),
      input.audioUrl ?? null,
      input.rawText ?? null,
      input.preciseLat ?? null,
      input.preciseLng ?? null,
      rateLimited ? "failed" : "queued"
    ]
  );
  const intakeId = insertResult.rows[0].id;

  if (rateLimited) {
    await query(
      `UPDATE intake_submissions SET processing_error = $2 WHERE id = $1`,
      [intakeId, "rate_limited: exceeded max submissions per hour for this number"]
    );
    return { intakeId, rateLimited: true };
  }

  const queue = getQueue();
  const queueJobId = await queue.enqueue({ intakeId, channel: input.channel });

  await query(`UPDATE intake_submissions SET queue_job_id = $2 WHERE id = $1`, [
    intakeId,
    queueJobId
  ]);

  return { intakeId, rateLimited: false, queueJobId };
}
