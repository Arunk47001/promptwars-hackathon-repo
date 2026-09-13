# Database Schema

Postgres + PostGIS. Migrations live in `/migrations` as plain numbered
`.sql` files, applied in order by `scripts/migrate.ts` (`npm run migrate`).
The PostGIS extension is enabled in `001_init.sql` (`lat`/`lng` are stored
as plain `DOUBLE PRECISION` columns for simplicity in this prototype rather
than a `geometry` column; PostGIS is available for any future
polygon/geometry work, e.g. district boundary shapes for the choropleth).

## Tables

| Table | Purpose | Key columns | Join key |
|---|---|---|---|
| `intake_submissions` | **Restricted, intake-only.** Raw Twilio webhook payload as received, plaintext phone number, audio reference, precise (ungeneralized) GPS if provided. Never queried by the dashboard/fusion layer directly. | `id`, `phone_plaintext`, `phone_hash`, `raw_payload`, `audio_url`, `precise_lat/lng`, `processing_status` | `id` referenced by `clean_submissions.intake_id` |
| `clean_submissions` | Anonymized, structured citizen submissions the fusion/scoring/dashboard layers actually read. No plaintext phone, no name, location generalized to district (+ optional block/village). | `id`, `phone_hash`, `category`, `description`, `district`, `urgency`, `sentiment`, `is_likely_duplicate`, `score_weight` | `district` (+ `category`) joins to reference tables / hotspot scores |
| `ref_demographics` | Census 2011 district-level demographics. | `district` (PK), `population`, `population_density`, `literacy_rate`, `sc_st_population_pct` | `district` |
| `ref_infrastructure` | NFHS-5 district factsheet infrastructure-access indicators. | `district` (PK), `households_with_electricity_pct`, `households_with_improved_water_pct`, `households_near_health_facility_pct` | `district` |
| `ref_investment` | PMGSY rural-road connectivity + investment data, used as the "already-planned/budgeted investment" signal. | `district` (PK), `pmgsy_roads_sanctioned`, `pmgsy_roads_completed`, `pmgsy_investment_sanctioned_lakh_rupees` | `district` |
| `hotspot_scores` | Computed weighted-scoring output: one row per district+category+computation wave. | `district`, `category`, `demand_volume`, `infra_gap_score`, `investment_offset`, `composite_score`, `computation_wave` | `district` + `category` |
| `hotspot_rationales` | Cached Gemini 2.5 Pro-generated written rationale per hotspot score row. | `hotspot_score_id` (FK) | `hotspot_score_id` → `hotspot_scores.id` |
| `impact_actions` | "Mark as funded/actioned" records; links a pre-action and post-action `hotspot_scores` row for the same district+category, plus re-engagement metadata. | `district`, `category`, `actioned_at`, `pre_action_hotspot_score_id`, `post_action_hotspot_score_id` | `district` + `category` |

## Anonymization boundary

`intake_submissions` is the **only** table holding plaintext phone numbers
or precise (pre-generalization) coordinates. Every other table is derived
from it through the anonymization module (`lib/anonymize.ts`) and the
worker route (`app/api/worker/process/route.ts`). Application code outside
the webhook handlers, the worker, and explicit audit/debug tooling must
never query `intake_submissions`.

## Running migrations

```bash
docker compose up -d          # starts Postgres+PostGIS on localhost:5432
cp .env.example .env.local     # then fill in DATABASE_URL etc.
npm run migrate                 # applies migrations/*.sql in order
```

Re-running `npm run migrate` against an already-migrated database is a
no-op (tracked in the `schema_migrations` table).
