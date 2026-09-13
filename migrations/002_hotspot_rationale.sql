-- 002_hotspot_rationale.sql
-- Cache table for Gemini 2.5 Pro-generated hotspot rationale text (C11), so
-- the dashboard is not forced to re-call the model on every page load.

CREATE TABLE IF NOT EXISTS hotspot_rationales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotspot_score_id UUID NOT NULL REFERENCES hotspot_scores (id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model TEXT NOT NULL,
  rationale_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rationale_hotspot ON hotspot_rationales (hotspot_score_id);
