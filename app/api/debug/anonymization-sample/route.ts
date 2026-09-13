import { query } from "@/lib/db";
import { anonymizeSubmission } from "@/lib/anonymize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/debug/anonymization-sample (C8 + C13's before/after toggle).
 *
 * If a real processed submission exists, returns its actual intake
 * (before) / clean (after) pair. Otherwise (fresh/empty database) falls
 * back to running the real anonymization module against a fixed synthetic
 * example containing a name and precise GPS coordinates, so the dashboard
 * debug view always has something to show without requiring seeded data
 * first - the transformation shown is the real module's real output
 * either way, not a hardcoded fake "after" value.
 */
export async function GET() {
  const pairResult = await query<{
    intake_id: string;
    phone_plaintext: string;
    raw_text: string | null;
    precise_lat: number | null;
    precise_lng: number | null;
    clean_id: string;
    description: string;
    district: string;
    block: string | null;
    village: string | null;
  }>(
    `SELECT i.id AS intake_id, i.phone_plaintext, i.raw_text, i.precise_lat, i.precise_lng,
            cs.id AS clean_id, cs.description, cs.district, cs.block, cs.village
     FROM clean_submissions cs
     JOIN intake_submissions i ON i.id = cs.intake_id
     ORDER BY cs.created_at DESC
     LIMIT 1`
  );

  const row = pairResult.rows[0];
  if (row) {
    return Response.json({
      source: "real_processed_submission",
      before: {
        phoneNumber: row.phone_plaintext,
        rawText: row.raw_text,
        preciseLat: row.precise_lat,
        preciseLng: row.precise_lng
      },
      after: {
        phoneHash: "(see clean_submissions.phone_hash - salted, one-way)",
        description: row.description,
        district: row.district,
        block: row.block,
        village: row.village
      }
    });
  }

  const example = {
    phoneNumber: "+919812345678",
    rawText:
      "My name is Ramesh Kumar and my phone is 9812345678. The hand pump near my house in Barhara Kothi village has been broken for 3 weeks, we have no clean water.",
    location: {
      district: "Patna",
      block: "Barh",
      village: "Barhara Kothi",
      preciseLat: 25.5941,
      preciseLng: 85.1376
    }
  };
  const anonymized = anonymizeSubmission(example);

  return Response.json({
    source: "synthetic_example_via_real_anonymize_module",
    before: {
      phoneNumber: example.phoneNumber,
      rawText: example.rawText,
      preciseLat: example.location.preciseLat,
      preciseLng: example.location.preciseLng
    },
    after: {
      phoneHash: anonymized.phoneHash,
      description: anonymized.cleanText,
      district: anonymized.location.district,
      block: anonymized.location.block,
      village: anonymized.location.village
    }
  });
}
