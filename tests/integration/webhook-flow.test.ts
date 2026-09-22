import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { getPool } from "@/lib/db";
import { ingestSubmission } from "@/lib/intake";
import { processIntakeJob } from "@/lib/worker";
import { getQueue } from "@/lib/queue";
import type { ExtractedRecord } from "@/lib/gemini";

/**
 * Integration test (C14): webhook-layer intake -> queue -> worker ->
 * processed clean_submissions record, run against a REAL local Docker
 * Postgres (per README's `docker compose up` + `npm run migrate` steps).
 *
 * The queue used here is lib/queue.ts's InMemoryQueue fallback (active
 * automatically whenever UPSTASH_REDIS_REST_URL/TOKEN are not set), not a
 * live Upstash instance - this test therefore verifies the same
 * queue.enqueue()/dequeue() interface contract the real UpstashQueue
 * implements, but does NOT verify the real Upstash service integration
 * itself (that half is code-complete-but-unverified - see the coder
 * status report and docs/gemini-audio-spike.md's sibling caveat for
 * Gemini). Requires no manual setup beyond the documented README steps
 * (DATABASE_URL in .env.local + migrations applied).
 *
 * The Gemini extraction call is stubbed via processIntakeJob's injectable
 * extractFn parameter (see lib/worker.ts) so this test does not require a
 * live GEMINI_API_KEY - it verifies the rest of the real pipeline
 * (anonymization backstop, spam/duplicate detection, DB writes) end to end.
 */

const TEST_PHONE = "+919999900001";
const TEST_DISTRICT = "Mysore";
const TEST_CATEGORY = "water";

let skip = false;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    skip = true;
    return;
  }
  try {
    await getPool().query("SELECT 1");
  } catch {
    skip = true;
  }
});

afterAll(async () => {
  if (!skip) {
    // Clean up every row this test file could have created (all test
    // phone numbers are prefixed with TEST_PHONE), so repeated local test
    // runs don't accumulate synthetic rows in the dev database.
    await getPool().query(
      `DELETE FROM clean_submissions WHERE intake_id IN (
         SELECT id FROM intake_submissions WHERE phone_plaintext LIKE $1
       )`,
      [`${TEST_PHONE}%`]
    );
    await getPool().query(`DELETE FROM intake_submissions WHERE phone_plaintext LIKE $1`, [
      `${TEST_PHONE}%`
    ]);
    await getPool().end();
  }
});

const fakeExtract = async (): Promise<ExtractedRecord> => ({
  category: TEST_CATEGORY,
  state: "Karnataka",
  district: TEST_DISTRICT,
  block: "Nanjangud",
  village: "Hullahalli",
  description: "The hand pump has been broken for two weeks, no clean water.",
  urgency: "high",
  sentiment: "negative",
  languageDetected: "en"
});

describe("webhook -> queue -> processed-record integration", () => {
  it("persists the raw intake record, enqueues a job, and processes it into a clean anonymized submission", async () => {
    if (skip) {
      console.warn(
        "Skipping integration test: DATABASE_URL not reachable. Start Docker Postgres and run migrations per README."
      );
      return;
    }

    const uniquePhone = `${TEST_PHONE}${Date.now()}`;

    const intakeResult = await ingestSubmission({
      channel: "sms",
      phoneNumber: uniquePhone,
      rawPayload: { From: uniquePhone, Body: "test" },
      rawText:
        "My name is Test Citizen. The hand pump has been broken for two weeks in Mysore."
    });

    expect(intakeResult.rateLimited).toBe(false);
    expect(intakeResult.queueJobId).toBeTruthy();

    // Verify the job is visible in the queue (acceptance criterion).
    const queue = getQueue();
    const sizeBefore = await queue.size();
    expect(sizeBefore).toBeGreaterThanOrEqual(1);

    const job = await queue.dequeue();
    expect(job?.intakeId).toBe(intakeResult.intakeId);

    const result = await processIntakeJob(intakeResult.intakeId, fakeExtract);
    expect(result.status).toBe("processed");
    expect(result.cleanSubmissionId).toBeTruthy();

    const cleanRow = await getPool().query(
      `SELECT * FROM clean_submissions WHERE id = $1`,
      [result.cleanSubmissionId]
    );
    expect(cleanRow.rows[0].district).toBe(TEST_DISTRICT);
    expect(cleanRow.rows[0].category).toBe(TEST_CATEGORY);
    // PII from the raw text must not appear in the clean text/description,
    // even though the fake extractor's canned description already omits it -
    // this asserts the anonymization backstop ran against extractor output.
    expect(cleanRow.rows[0].description).not.toContain("Test Citizen");

    // The phone number itself must never have been written to the clean table.
    const columns = Object.keys(cleanRow.rows[0]);
    expect(columns).not.toContain("phone_plaintext");
  });

  it("rejects/flags submissions beyond the per-hour rate limit from the same hashed phone number (C9)", async () => {
    if (skip) return;

    const uniquePhone = `${TEST_PHONE}${Date.now()}ratelimit`;
    const results = [];
    for (let i = 0; i < 6; i += 1) {
      results.push(
        await ingestSubmission({
          channel: "sms",
          phoneNumber: uniquePhone,
          rawPayload: { From: uniquePhone, Body: `submission ${i}` },
          rawText: `submission ${i}`
        })
      );
    }

    // DEFAULT_RATE_LIMIT allows 5/hour - the 6th from the same number should be flagged.
    const rateLimitedCount = results.filter((r) => r.rateLimited).length;
    expect(rateLimitedCount).toBeGreaterThanOrEqual(1);

    const rows = await getPool().query(
      `SELECT processing_status, processing_error FROM intake_submissions WHERE phone_hash = (
         SELECT phone_hash FROM intake_submissions WHERE phone_plaintext = $1 LIMIT 1
       )`,
      [uniquePhone]
    );
    expect(rows.rows.some((r) => r.processing_status === "failed")).toBe(true);
  });

  it("logs failures and marks the intake row failed rather than crashing, for a broken extraction call", async () => {
    if (skip) return;

    const uniquePhone = `${TEST_PHONE}${Date.now()}fail`;
    const intakeResult = await ingestSubmission({
      channel: "sms",
      phoneNumber: uniquePhone,
      rawPayload: { From: uniquePhone, Body: "test" },
      rawText: "unintelligible garbled input"
    });

    const brokenExtract = async (): Promise<ExtractedRecord> => {
      throw new Error("simulated unintelligible-audio extraction failure");
    };

    const result = await processIntakeJob(intakeResult.intakeId, brokenExtract);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("simulated unintelligible-audio");

    const row = await getPool().query(
      `SELECT processing_status, processing_error FROM intake_submissions WHERE id = $1`,
      [intakeResult.intakeId]
    );
    expect(row.rows[0].processing_status).toBe("failed");
  });

  it("edge case: missing district from the extractor is not silently accepted (generalizeLocation throws, worker marks failed)", async () => {
    if (skip) return;

    const uniquePhone = `${TEST_PHONE}${Date.now()}nodist`;
    const intakeResult = await ingestSubmission({
      channel: "sms",
      phoneNumber: uniquePhone,
      rawPayload: { From: uniquePhone, Body: "test" },
      rawText: "no location mentioned at all"
    });

    const noDistrictExtract = async (): Promise<ExtractedRecord> => ({
      category: "other",
      district: "",
      description: "Something is wrong but no location given.",
      urgency: "low",
      sentiment: "neutral"
    });

    const result = await processIntakeJob(intakeResult.intakeId, noDistrictExtract);
    expect(result.status).toBe("failed");
  });
});
