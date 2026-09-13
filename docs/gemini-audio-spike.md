# Gemini 2.5 Flash native-audio spike (C6)

## Status: NOT executed against the live Gemini API in this build session

This build environment does not have a Google AI Studio / Gemini API key
provisioned, and no real or realistic recorded Indian-language/accented
voice clips were available to send. **No live Gemini audio call was made.**
This document is therefore a spike *plan and go/no-go decision procedure*
that a builder with real Gemini API access and sample audio should execute
before relying on the native-audio path in production, plus the fallback
wiring that lets the system run safely either way in the meantime.

This is disclosed here, and in the coder status report, as
**code-complete-but-unverified-against-the-live-service**: `lib/gemini.ts`
implements both the native-audio call path and the fallback text-only
path, selected per-language by a config flag, so the worker (C7) does not
block on this spike's completion — it defaults to the native-audio path
per the plan's recommendation, with the fallback flag ready to flip per
language the moment real testing shows a language underperforms.

## What the real spike should do (per the plan)

1. Collect a handful (5-10) of real or realistic short (<60s) voice clips
   covering: at least one Hindi clip, at least one Bihar-relevant regional
   language/accent (e.g. Bhojpuri- or Maithili-accented Hindi, given the
   Bihar demo scope), and at least one English-accented-Indian-English
   clip, each describing a plausible citizen infrastructure complaint
   (e.g. "this road floods every monsoon," "no electricity for three
   days").
2. For each clip, call Gemini 2.5 Flash with the audio attached directly
   (per Google AI Studio's multimodal audio-input API) and a single prompt
   instructing it to: (a) transcribe, (b) translate to English, (c)
   extract `{ category, district/block/village, description, urgency,
   sentiment }` as structured JSON, and (d) redact any volunteered
   personal name from the description (see `lib/anonymize.ts` for the
   redundant deterministic backstop to this instruction).
3. Score each clip pass/fail against three criteria:
   - **Accuracy**: transcription/translation is intelligible and the
     extracted category/location/description are substantively correct
     compared to a human's reading of the clip.
   - **Latency**: end-to-end call completes comfortably inside the
     worker's execution budget (see `docs/vercel-function-duration.md`
     caveat in README — this itself depends on the confirmed Vercel plan
     tier, a deploy-lane concern).
   - **Cost**: per-call token/pricing estimate is sustainable for a
     per-submission workload at expected demo volume.
4. **Go/no-go rule** (per language): if a language passes all three, use
   the native-audio path (`extraction_path = 'gemini-native-audio'`) for
   that language. If it fails any criterion, set that language's entry in
   `GEMINI_FALLBACK_LANGUAGES` (see `lib/gemini.ts`) so submissions
   detected in that language use the fallback path
   (`extraction_path = 'fallback-stt-pipeline'`) instead — Approach B's
   explicit STT + translation + extraction pipeline for that language
   only, per the plan. Gemini remains in use for text-based extraction and
   rationale generation regardless of this result.

## What's implemented now, independent of the spike's outcome

- `lib/gemini.ts` exports `extractStructuredRecord()`, which branches on a
  per-submission `languageHint` against `GEMINI_FALLBACK_LANGUAGES`
  (currently empty by default — i.e. defaults to native-audio for every
  language until a real spike says otherwise for a specific one).
- The native-audio branch sends the audio reference + PII-scrub instruction
  to Gemini 2.5 Flash in one call, matching Approach A.
- The fallback branch is stubbed to call a pluggable
  `transcribeAndTranslate()` function (Approach B's explicit pipeline)
  before handing the resulting text to the same structured-extraction
  prompt — implemented as a clearly-marked TODO integration point (no
  hosted STT/translation vendor is wired in, since decision scope did not
  require picking one until a language actually fails the spike), so
  wiring in a real hosted STT/translation API later is a contained change
  in one function.
- Every extraction call records which path was used
  (`clean_submissions.extraction_path`), so the dashboard/debug view and
  any future real spike results are auditable against real production
  data, not just this planning document.

## Recommendation

Proceed with Approach A (native-audio-first, per-language fallback) as
coded, but do not treat the "go" decision as validated until the steps
above are actually run against a real Gemini API key and real audio
samples — this is a build-time task for whoever has that access, flagged
explicitly rather than silently assumed.
