-- 001_init.sql
-- Core schema: intake-only table, clean anonymized submissions, reference
-- tables (demographics/infrastructure/investment), hotspot scores, impact
-- tracking. See SCHEMA.md for the human-readable description of each table.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- INTAKE-ONLY TABLE (restricted access; holds raw + PII)
-- =====================================================================
-- Structurally separate from every table the dashboard/fusion layer
-- queries. Only the webhook handlers, the worker, and admin/audit tooling
-- should ever read from this table.
CREATE TABLE IF NOT EXISTS intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'sms', 'whatsapp')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Restricted PII: plaintext phone retained here only, never copied to
  -- the clean tables.
  phone_plaintext TEXT NOT NULL,
  phone_hash TEXT NOT NULL,

  -- Raw payload as received from Twilio (form-encoded body, parsed to JSON).
  raw_payload JSONB NOT NULL,

  -- For voice: reference to the recording (Twilio RecordingUrl / our own
  -- storage reference). NULL for sms/whatsapp text-only submissions.
  audio_url TEXT,

  -- Raw free-text body for sms/whatsapp (pre-translation/extraction).
  raw_text TEXT,

  -- Precise location as volunteered (e.g. WhatsApp GPS pin), before any
  -- generalization. NULL if not provided.
  precise_lat DOUBLE PRECISION,
  precise_lng DOUBLE PRECISION,

  processing_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (processing_status IN ('queued', 'processing', 'processed', 'failed')),
  processing_error TEXT,

  queue_job_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_intake_phone_hash ON intake_submissions (phone_hash);
CREATE INDEX IF NOT EXISTS idx_intake_received_at ON intake_submissions (received_at);
CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_submissions (processing_status);

-- =====================================================================
-- CLEAN / ANONYMIZED SUBMISSIONS (what the fusion layer & dashboard query)
-- =====================================================================
CREATE TABLE IF NOT EXISTS clean_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES intake_submissions (id),
  channel TEXT NOT NULL CHECK (channel IN ('voice', 'sms', 'whatsapp')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Salted hash only; never the plaintext number.
  phone_hash TEXT NOT NULL,

  category TEXT NOT NULL, -- e.g. 'water', 'roads', 'electricity', 'health', 'other'
  description TEXT NOT NULL, -- PII-scrubbed, translated-to-English description
  language_detected TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  sentiment TEXT CHECK (sentiment IN ('negative', 'neutral', 'positive')),

  -- Location generalized to district (required) / block+village (optional
  -- finer detail, still coarser than the raw GPS pin).
  state TEXT,
  district TEXT NOT NULL,
  block TEXT,
  village TEXT,

  -- Spam/duplicate detection outputs (C9). Duplicate/burst-flagged records
  -- are kept, not dropped, and are down-weighted in scoring (C10).
  is_likely_duplicate BOOLEAN NOT NULL DEFAULT false,
  duplicate_of UUID REFERENCES clean_submissions (id),
  duplicate_similarity REAL,
  is_burst_flagged BOOLEAN NOT NULL DEFAULT false,
  score_weight REAL NOT NULL DEFAULT 1.0,

  -- Which processing path produced this record (C6/C7 fallback tracking).
  extraction_path TEXT NOT NULL DEFAULT 'gemini-native-audio'
    CHECK (extraction_path IN ('gemini-native-audio', 'gemini-text', 'fallback-stt-pipeline')),

  -- Re-engagement tracking (C12): links a follow-up submission back to the
  -- original wave it was solicited from.
  reengagement_of_district TEXT,
  reengagement_of_category TEXT
);

CREATE INDEX IF NOT EXISTS idx_clean_district ON clean_submissions (district);
CREATE INDEX IF NOT EXISTS idx_clean_district_category ON clean_submissions (district, category);
CREATE INDEX IF NOT EXISTS idx_clean_created_at ON clean_submissions (created_at);
CREATE INDEX IF NOT EXISTS idx_clean_phone_hash ON clean_submissions (phone_hash);

-- =====================================================================
-- REFERENCE TABLES (keyed on district)
-- =====================================================================
CREATE TABLE IF NOT EXISTS ref_demographics (
  district TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  population INTEGER,
  population_density REAL, -- persons per sq km
  rural_population_pct REAL,
  literacy_rate REAL,
  sc_st_population_pct REAL,
  source TEXT NOT NULL DEFAULT 'Census of India 2011',
  source_year INTEGER NOT NULL DEFAULT 2011
);

CREATE TABLE IF NOT EXISTS ref_infrastructure (
  district TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  households_with_electricity_pct REAL,
  households_with_improved_water_pct REAL,
  households_with_improved_sanitation_pct REAL,
  households_near_health_facility_pct REAL, -- <5km per NFHS-5 proxy
  source TEXT NOT NULL DEFAULT 'NFHS-5 (2019-21) district factsheets',
  source_year INTEGER NOT NULL DEFAULT 2021
);

CREATE TABLE IF NOT EXISTS ref_investment (
  district TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  pmgsy_habitations_eligible INTEGER,
  pmgsy_habitations_connected INTEGER,
  pmgsy_roads_sanctioned INTEGER,
  pmgsy_roads_completed INTEGER,
  pmgsy_investment_sanctioned_lakh_rupees REAL,
  source TEXT NOT NULL DEFAULT 'PMGSY / OMMAS public dashboard',
  source_year INTEGER NOT NULL DEFAULT 2023
);

-- =====================================================================
-- HOTSPOT SCORES (C10)
-- =====================================================================
CREATE TABLE IF NOT EXISTS hotspot_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  district TEXT NOT NULL,
  category TEXT NOT NULL,

  demand_volume REAL NOT NULL,       -- weighted submission count (z-scored)
  demand_volume_raw REAL NOT NULL,   -- raw weighted count before z-scoring
  infra_gap_score REAL NOT NULL,     -- z-scored infra-gap severity
  investment_offset REAL NOT NULL,   -- z-scored existing planned investment
  composite_score REAL NOT NULL,     -- demand_volume + infra_gap_score - investment_offset

  submission_count INTEGER NOT NULL,
  duplicate_count INTEGER NOT NULL DEFAULT 0,

  is_actioned BOOLEAN NOT NULL DEFAULT false,
  actioned_at TIMESTAMPTZ,

  -- Which computation "wave" this row belongs to: lets us keep both a
  -- pre-action and post-action score for the same district+category
  -- (C12) instead of overwriting history.
  computation_wave TEXT NOT NULL DEFAULT 'baseline'
);

CREATE INDEX IF NOT EXISTS idx_hotspot_district_category ON hotspot_scores (district, category);
CREATE INDEX IF NOT EXISTS idx_hotspot_composite_score ON hotspot_scores (composite_score DESC);

-- =====================================================================
-- IMPACT TRACKING (C12)
-- =====================================================================
CREATE TABLE IF NOT EXISTS impact_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  category TEXT NOT NULL,
  actioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actioned_by TEXT, -- free-text policymaker/dashboard-user identifier
  note TEXT,
  pre_action_hotspot_score_id UUID REFERENCES hotspot_scores (id),
  post_action_hotspot_score_id UUID REFERENCES hotspot_scores (id),
  reengagement_triggered_at TIMESTAMPTZ,
  reengagement_message TEXT,
  reengagement_recipient_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_impact_district_category ON impact_actions (district, category);
