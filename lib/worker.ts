import { query } from "./db";
import { extractStructuredRecord, type ExtractedRecord, type ExtractInput } from "./gemini";
import { scrubPii, generalizeLocation } from "./anonymize";
import {
  checkDuplicate,
  detectBurst,
  computeScoreWeight,
  type RecentSubmission
} from "./spam";

export interface ProcessJobResult {
  status: "processed" | "failed" | "not_found" | "already_processed";
  cleanSubmissionId?: string;
  error?: string;
}

interface IntakeRow {
  id: string;
  channel: "voice" | "sms" | "whatsapp";
  phone_hash: string;
  audio_url: string | null;
  raw_text: string | null;
  processing_status: string;
  raw_payload: {
    _reengagement?: { district: string; category: string };
  } | null;
}

/**
 * C7: the async processing worker's core logic (queue-invoked route is a
 * thin wrapper around this, in app/api/worker/process/route.ts).
 *
 * Failure handling: any error in the Gemini call or downstream steps is
 * caught, logged, and recorded on the intake row's processing_error column
 * - it does not throw out of this function (so the calling route can
 * always return a clean 200 and the worker never crashes on bad input like
 * unintelligible audio).
 *
 * `extractFn` defaults to the real Gemini-backed extractStructuredRecord,
 * but can be overridden (tests do this) so the rest of the pipeline -
 * anonymization backstop, spam/duplicate detection, clean-record insert -
 * is exercised end-to-end against the real local Docker Postgres without
 * requiring a live Gemini API key.
 */
export async function processIntakeJob(
  intakeId: string,
  extractFn: (input: ExtractInput) => Promise<ExtractedRecord> = extractStructuredRecord
): Promise<ProcessJobResult> {
  const intakeResult = await query<IntakeRow>(
    `SELECT id, channel, phone_hash, audio_url, raw_text, processing_status, raw_payload
     FROM intake_submissions WHERE id = $1`,
    [intakeId]
  );
  const intake = intakeResult.rows[0];
  if (!intake) {
    return { status: "not_found" };
  }
  if (intake.processing_status === "processed") {
    return { status: "already_processed" };
  }

  await query(`UPDATE intake_submissions SET processing_status = 'processing' WHERE id = $1`, [
    intakeId
  ]);

  try {
    const extracted = await extractFn({
      text: intake.raw_text ?? undefined,
      audioBase64: undefined, // NOTE: fetching+base64-encoding the audio_url is left as an
      // integration point for whoever wires a real Gemini key/audio storage -
      // see docs/gemini-audio-spike.md. Voice submissions currently fall
      // back to text-channel extraction using any raw_text Twilio provided
      // (e.g. a transcription hint), rather than crashing the worker.
      audioMimeType: undefined
    });

    // Anonymization backstop (C8): re-run the deterministic PII scrub even
    // though the Gemini prompt already instructs redaction, and enforce
    // location generalization regardless of what Gemini returned.
    const { scrubbed: cleanDescription } = scrubPii(extracted.description);
    const location = generalizeLocation({
      state: extracted.state,
      district: extracted.district,
      block: extracted.block,
      village: extracted.village
    });

    // Spam/duplicate detection (C9).
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentResult = await query<{
      id: string;
      description: string;
      phone_hash: string;
      created_at: Date;
    }>(
      `SELECT id, description, phone_hash, created_at FROM clean_submissions
       WHERE district = $1 AND category = $2 AND created_at >= $3
       ORDER BY created_at DESC LIMIT 200`,
      [location.district, extracted.category, windowStart]
    );
    const recent: RecentSubmission[] = recentResult.rows.map((r) => ({
      id: r.id,
      description: r.description,
      phoneHash: r.phone_hash,
      createdAtMs: new Date(r.created_at).getTime()
    }));

    const dup = checkDuplicate(cleanDescription, recent);
    const burst = detectBurst(cleanDescription, recent);
    const scoreWeight = computeScoreWeight({
      isLikelyDuplicate: dup.isDuplicate,
      isBurstFlagged: burst.isBurst
    });

    const reengagement = intake.raw_payload?._reengagement;

    const insertResult = await query<{ id: string }>(
      `INSERT INTO clean_submissions
         (intake_id, channel, phone_hash, category, description, language_detected,
          urgency, sentiment, state, district, block, village,
          is_likely_duplicate, duplicate_of, duplicate_similarity, is_burst_flagged,
          score_weight, extraction_path, reengagement_of_district, reengagement_of_category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      [
        intakeId,
        intake.channel,
        intake.phone_hash,
        extracted.category,
        cleanDescription,
        extracted.languageDetected ?? null,
        extracted.urgency,
        extracted.sentiment,
        location.state ?? null,
        location.district,
        location.block ?? null,
        location.village ?? null,
        dup.isDuplicate,
        dup.matchedId ?? null,
        dup.similarity ?? null,
        burst.isBurst,
        scoreWeight,
        "gemini-native-audio",
        reengagement?.district ?? null,
        reengagement?.category ?? null
      ]
    );

    await query(`UPDATE intake_submissions SET processing_status = 'processed' WHERE id = $1`, [
      intakeId
    ]);

    return { status: "processed", cleanSubmissionId: insertResult.rows[0].id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`worker: processing failed for intake ${intakeId}:`, message);
    await query(
      `UPDATE intake_submissions SET processing_status = 'failed', processing_error = $2 WHERE id = $1`,
      [intakeId, message]
    );
    return { status: "failed", error: message };
  }
}
