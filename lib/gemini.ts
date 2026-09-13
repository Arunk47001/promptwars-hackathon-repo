/**
 * Gemini API client (C7, C11). Talks to Google AI Studio's Generative
 * Language REST API directly via fetch (no SDK dependency) so it is easy
 * to unit test with a mocked fetch implementation.
 *
 * IMPORTANT: this module has NOT been exercised against a real Gemini API
 * key/live network call in this build (no GEMINI_API_KEY was provisioned
 * in this environment) - see docs/gemini-audio-spike.md. It is
 * code-complete but unverified against the live service. Unit/integration
 * tests inject a fake `fetchImpl` to verify the request shape and response
 * parsing without a real API key.
 */

export interface ExtractedRecord {
  category: string;
  state?: string;
  district: string;
  block?: string;
  village?: string;
  description: string;
  urgency: "low" | "medium" | "high";
  sentiment: "negative" | "neutral" | "positive";
  languageDetected?: string;
}

export interface ExtractInput {
  /** Raw free text (SMS/WhatsApp text, or a pre-transcribed voice note). */
  text?: string;
  /** Base64-encoded audio payload for the native-audio path (voice channel). */
  audioBase64?: string;
  audioMimeType?: string;
  /**
   * Best-effort language hint (e.g. from Twilio's `Language` param or a
   * prior detection pass). Used only to decide native-audio vs. fallback
   * routing per docs/gemini-audio-spike.md; Gemini itself still detects
   * the actual language from the content.
   */
  languageHint?: string;
}

/**
 * Languages for which the C6 spike found (or is expected to find) native
 * audio understanding unreliable, and which should therefore route through
 * the Approach-B fallback STT+translation pipeline instead. Empty by
 * default: until a real spike says otherwise for a specific language, this
 * build defaults to the native-audio path for everything, per the plan's
 * recommended Approach A.
 */
export const GEMINI_FALLBACK_LANGUAGES: string[] = [];

export function shouldUseFallbackPipeline(languageHint?: string): boolean {
  if (!languageHint) return false;
  return GEMINI_FALLBACK_LANGUAGES.includes(languageHint.toLowerCase());
}

const EXTRACTION_PROMPT = `You are a data-extraction assistant for a citizen infrastructure-complaint intake platform in India. Given a citizen's submission (voice audio, or already-transcribed text), do the following in one pass:
1. Transcribe (if audio) and translate the content to English.
2. Classify it into exactly one category: "water", "roads", "electricity", "health", "sanitation", or "other".
3. Extract the Indian administrative location mentioned (state, district, block/village if mentioned). If no location is stated, use district "Unknown".
4. Write a concise (1-2 sentence) English description of the citizen's issue.
5. Classify urgency as "low", "medium", or "high" and sentiment as "negative", "neutral", or "positive".
6. CRITICAL PRIVACY STEP: if the citizen volunteers their own name or any other direct personal identifier in the submission, DO NOT include it anywhere in your output description - omit it entirely rather than redacting it in place.

Respond with ONLY a single JSON object, no markdown fences, matching this shape:
{"category": string, "state": string|null, "district": string, "block": string|null, "village": string|null, "description": string, "urgency": "low"|"medium"|"high", "sentiment": "negative"|"neutral"|"positive", "languageDetected": string}`;

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function getModel(kind: "flash" | "pro"): string {
  return kind === "flash"
    ? process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash"
    : process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro";
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Copy .env.example to .env.local and set it."
    );
  }
  return key;
}

async function callGemini(
  model: string,
  parts: Array<Record<string, unknown>>,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2 }
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as GeminiGenerateContentResponse;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned no text content");
  }
  return text;
}

function parseJsonResponse(text: string): ExtractedRecord {
  // Defensive: strip markdown fences if the model added them anyway.
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }
  const p = parsed as Record<string, unknown>;
  if (!p.district || !p.description || !p.category) {
    throw new Error(
      `Gemini response missing required fields: ${JSON.stringify(p).slice(0, 200)}`
    );
  }
  return {
    category: String(p.category),
    state: p.state ? String(p.state) : undefined,
    district: String(p.district),
    block: p.block ? String(p.block) : undefined,
    village: p.village ? String(p.village) : undefined,
    description: String(p.description),
    urgency: (["low", "medium", "high"].includes(String(p.urgency))
      ? p.urgency
      : "medium") as ExtractedRecord["urgency"],
    sentiment: (["negative", "neutral", "positive"].includes(String(p.sentiment))
      ? p.sentiment
      : "neutral") as ExtractedRecord["sentiment"],
    languageDetected: p.languageDetected ? String(p.languageDetected) : undefined
  };
}

export interface TranscribeAndTranslateResult {
  translatedText: string;
  languageDetected?: string;
}

/**
 * Approach-B fallback stage (STT + translation), used only for languages
 * flagged in GEMINI_FALLBACK_LANGUAGES per the C6 spike outcome. Not wired
 * to a real hosted STT/translation vendor in this build (no such vendor
 * needed selecting until a real spike flags a specific language) - this is
 * the documented integration point for whoever does that work.
 */
export async function transcribeAndTranslate(
  _audioBase64: string,
  _audioMimeType: string
): Promise<TranscribeAndTranslateResult> {
  throw new Error(
    "transcribeAndTranslate() fallback pipeline is not wired to a hosted " +
      "STT/translation vendor in this build (no language has been flagged " +
      "into GEMINI_FALLBACK_LANGUAGES yet - see docs/gemini-audio-spike.md). " +
      "Implement this once a real Gemini-audio spike flags a specific language."
  );
}

export async function extractStructuredRecord(
  input: ExtractInput,
  fetchImpl: typeof fetch = fetch
): Promise<ExtractedRecord> {
  const useFallback = shouldUseFallbackPipeline(input.languageHint);

  let parts: Array<Record<string, unknown>>;

  if (input.audioBase64 && !useFallback) {
    // Native-audio path (Approach A / default).
    parts = [
      { text: EXTRACTION_PROMPT },
      {
        inline_data: {
          mime_type: input.audioMimeType || "audio/ogg",
          data: input.audioBase64
        }
      }
    ];
  } else if (input.audioBase64 && useFallback) {
    // Approach-B fallback path for a flagged language.
    const { translatedText } = await transcribeAndTranslate(
      input.audioBase64,
      input.audioMimeType || "audio/ogg"
    );
    parts = [{ text: `${EXTRACTION_PROMPT}\n\nSubmission text:\n${translatedText}` }];
  } else {
    // Text channel (SMS/WhatsApp) - always goes through Gemini text extraction.
    parts = [{ text: `${EXTRACTION_PROMPT}\n\nSubmission text:\n${input.text ?? ""}` }];
  }

  const model = getModel("flash");
  const responseText = await callGemini(model, parts, fetchImpl);
  return parseJsonResponse(responseText);
}

export interface HotspotRationaleInput {
  district: string;
  category: string;
  submissionCount: number;
  duplicateCount: number;
  demandVolumeZ: number;
  infraGapZ: number;
  investmentOffsetZ: number;
  compositeScore: number;
  rank: number;
  totalRanked: number;
}

const RATIONALE_PROMPT_TEMPLATE = (input: HotspotRationaleInput) => `You are writing a short (3-5 sentence) policymaker-facing rationale explaining why a district+sector was ranked where it was in a citizen-infrastructure demand-hotspot dashboard. Reference the actual figures given below - do not write generic boilerplate.

District: ${input.district}
Sector/category: ${input.category}
Rank: ${input.rank} of ${input.totalRanked} ranked district+sector combinations
Citizen-reported submission count: ${input.submissionCount} (of which ${input.duplicateCount} were flagged as likely duplicates and down-weighted, not discarded)
Demand-volume z-score (citizen reports relative to all ranked districts/sectors): ${input.demandVolumeZ.toFixed(2)}
Infrastructure-gap z-score (higher = worse existing infrastructure per NFHS-5 indicators): ${input.infraGapZ.toFixed(2)}
Existing-investment offset z-score (higher = more already-planned/sanctioned PMGSY investment, which should argue against further prioritization): ${input.investmentOffsetZ.toFixed(2)}
Composite score (demand + infra-gap - investment offset): ${input.compositeScore.toFixed(2)}

Write the rationale now, in plain English, suitable for a policymaker who has not seen the raw numbers before.`;

export async function generateHotspotRationale(
  input: HotspotRationaleInput,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const model = getModel("pro");
  const parts = [{ text: RATIONALE_PROMPT_TEMPLATE(input) }];
  return callGemini(model, parts, fetchImpl);
}
