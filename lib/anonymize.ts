import { createHash } from "node:crypto";

/**
 * Anonymization module (C8).
 *
 * Three responsibilities, kept as pure/testable functions:
 *  1. Salted hash of a phone number (plaintext never leaves the intake table).
 *  2. PII scrub of free text (names / direct identifiers volunteered by the
 *     citizen) as a deterministic regex-based fallback/backstop to the
 *     Gemini PII-scrub instruction used in the extraction call (lib/gemini.ts).
 *  3. Location generalization: precise lat/lng -> district/block granularity.
 */

export function hashPhoneNumber(phoneNumber: string, salt?: string): string {
  const usedSalt = salt ?? process.env.PHONE_HASH_SALT;
  if (!usedSalt) {
    throw new Error(
      "PHONE_HASH_SALT is not set. Copy .env.example to .env.local and set it."
    );
  }
  return createHash("sha256").update(`${usedSalt}:${phoneNumber}`).digest("hex");
}

/**
 * Deterministic backstop PII scrub for free text. This runs in addition to
 * (not instead of) the PII-scrub instruction given to Gemini during
 * structured extraction (see lib/gemini.ts), because relying on a single
 * layer for a privacy-sensitive redaction step is fragile.
 *
 * Heuristics (intentionally simple / explainable, matching the plan's
 * "heuristic-based, not ML-based" scope for adjacent modules):
 *  - "my name is X" / "I am X" / "this is X calling" patterns.
 *  - Standalone capitalized 2-3 word sequences that look like a personal
 *    name (conservative: only fires on an explicit self-identification cue).
 *  - Indian mobile numbers appearing in free text (10 digits, optionally
 *    prefixed +91).
 */
const NAME_CUE_PATTERNS: RegExp[] = [
  /\bmy name is\s+([A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){0,2})/gi,
  /\bi am\s+([A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){1,2})\b/gi,
  /\bthis is\s+([A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){0,2})\s+calling/gi
];

const PHONE_IN_TEXT_PATTERN = /(?:\+?91[-\s]?)?[6-9]\d{9}\b/g;

export function scrubPii(text: string): { scrubbed: string; redactedCount: number } {
  let redactedCount = 0;
  let scrubbed = text;

  for (const pattern of NAME_CUE_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, (fullMatch, name) => {
      redactedCount += 1;
      return fullMatch.replace(name, "[REDACTED_NAME]");
    });
  }

  scrubbed = scrubbed.replace(PHONE_IN_TEXT_PATTERN, () => {
    redactedCount += 1;
    return "[REDACTED_PHONE]";
  });

  return { scrubbed, redactedCount };
}

export interface GeneralizedLocation {
  state?: string;
  district: string;
  block?: string;
  village?: string;
}

/**
 * Generalizes a precise location down to district (required) / block /
 * village granularity. In this prototype, precise lat/lng reverse-geocoding
 * to an Indian administrative unit is out of scope for a hackathon build
 * (would require a geocoding service); instead this function accepts an
 * already-resolved administrative unit (typically extracted by Gemini from
 * the submission text, or attached by the ingestion/demo fixtures) and
 * enforces the generalization *contract*: it strips anything finer than
 * village level and never returns raw coordinates.
 */
export function generalizeLocation(input: {
  state?: string;
  district: string;
  block?: string;
  village?: string;
  // Explicitly accepted (and explicitly discarded) so callers cannot
  // accidentally thread raw GPS through to the clean record.
  preciseLat?: number;
  preciseLng?: number;
}): GeneralizedLocation {
  if (!input.district || input.district.trim().length === 0) {
    throw new Error("generalizeLocation requires a non-empty district");
  }
  return {
    state: input.state?.trim() || undefined,
    district: input.district.trim(),
    block: input.block?.trim() || undefined,
    village: input.village?.trim() || undefined
  };
}

export interface RawSubmissionForAnonymization {
  phoneNumber: string;
  rawText: string;
  location: {
    state?: string;
    district: string;
    block?: string;
    village?: string;
    preciseLat?: number;
    preciseLng?: number;
  };
}

export interface AnonymizedSubmission {
  phoneHash: string;
  cleanText: string;
  redactedCount: number;
  location: GeneralizedLocation;
}

/** Convenience wrapper composing all three anonymization steps at once. */
export function anonymizeSubmission(
  input: RawSubmissionForAnonymization
): AnonymizedSubmission {
  const phoneHash = hashPhoneNumber(input.phoneNumber);
  const { scrubbed, redactedCount } = scrubPii(input.rawText);
  const location = generalizeLocation(input.location);
  return { phoneHash, cleanText: scrubbed, redactedCount, location };
}
