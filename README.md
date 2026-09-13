# BRICS Citizen Infrastructure Platform (India / Bihar demo)

A multilingual-capable, multi-channel citizen-intake pipeline (Twilio
Voice/SMS/WhatsApp) that anonymizes real citizen submissions, fuses them
with real Indian demographic/infrastructure/investment data, computes
transparent weighted-scoring "demand hotspots," and surfaces ranked,
explainable recommendations plus a working impact-tracking loop to a
policymaker dashboard.

Built from the task breakdown at
`.squad/task/brics-citizen-infrastructure-platform.md` (Coder tasks C1-C15).
Stack: **Next.js 14 (App Router) + TypeScript, Postgres+PostGIS, Upstash
Redis, Google Gemini API, Twilio**, deployable to Vercel (deploy lane,
D1-D8, is out of scope for this repo's coder work and is handled
separately).

## What's real, what's simulated, what's unverified

This was built in an environment with outbound internet access but no live
Twilio account, no Google AI Studio (Gemini) API key, and no live Upstash
account. To be transparent about exactly what that means:

- **Real data, live-fetched**: Census 2011, NFHS-5, and PMGSY reference
  data for Bihar are fetched from real public-data mirrors at ingestion
  time (see `docs/dataset-provenance.md` for exact sources, caveats, and
  two disclosed proxy substitutions). Nothing in the reference tables is
  fabricated.
- **Code-complete but unverified against the live service**: the Twilio
  webhook routes, the Upstash-backed queue, and the Gemini extraction/
  rationale calls are fully implemented and unit/integration-tested with
  mocked/injected dependencies, but have **not** been exercised against a
  real Twilio account, real Upstash instance, or real Gemini API key in
  this build session. See `docs/gemini-audio-spike.md` for the Gemini
  audio-path spike status specifically.
- **Simulated**: the impact-tracking re-engagement step (C12) simulates
  citizens' follow-up replies flowing back through the real pipeline,
  rather than sending/receiving real outbound Twilio messages (no live
  Twilio credentials in this environment) - see `lib/impact.ts`.

## Local development

### Prerequisites

- Node.js 20+ and npm.
- Docker Desktop (for local Postgres+PostGIS).
- Optional, for full end-to-end live-service testing: a Twilio account, a
  Google AI Studio (Gemini) API key, an Upstash account, and ngrok. None of
  these are required to run the app, ingest real reference data, exercise
  the webhook/worker/scoring/dashboard code paths with test data, or run
  the test suite.

### 1. Install dependencies

```bash
npm install
```

### 2. Start local Postgres+PostGIS

```bash
docker compose up -d
```

This starts a `postgis/postgis:16-3.4` container reachable at
`localhost:5432` (user `brics`, password `brics_dev_password`, database
`brics_citizen_platform` - see `docker-compose.yml`). Wait for it to report
healthy: `docker inspect --format='{{.State.Health.Status}}' brics-postgres`.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
- `DATABASE_URL` already matches the default `docker-compose.yml` values -
  no change needed for local dev.
- `PHONE_HASH_SALT`: generate a real random value, e.g.
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: optional for local
  dev. If left blank, `lib/queue.ts` automatically falls back to an
  in-memory queue so the webhook -> worker flow still runs locally end to
  end. Fill these in with a real free-tier Upstash Redis database
  (https://console.upstash.com/) to test against the actual production
  queue backend.
- `GEMINI_API_KEY`: required for the worker's extraction step and the
  hotspot-rationale route to actually call Gemini. Without it, those two
  code paths return a clear "GEMINI_API_KEY is not set" error rather than
  crashing - the rest of the app (ingestion, schema, scoring, dashboard,
  anonymization, spam detection) works without it.
- `TWILIO_*`: required only to receive real Twilio webhooks. Leave
  `TWILIO_VALIDATE_SIGNATURE=false` for local `curl`-based testing (see
  below); set it to `true` and fill in real credentials for any deployed
  environment.

### 4. Run migrations

```bash
npm run migrate
```

Applies every file in `/migrations` in order against the local Postgres
(idempotent - safe to re-run). See `SCHEMA.md` for the full schema.

### 5. Ingest real reference data (Bihar demo scope)

```bash
npm run ingest
```

Fetches and loads real Census 2011 / NFHS-5 / PMGSY data for Bihar's 38
districts. See `docs/dataset-provenance.md` for exact sources and
disclosed caveats/substitutions, and run
`npx tsx scripts/ingest/prepare-district-boundaries.ts` once to fetch the
real district-boundary GeoJSON the dashboard map uses
(`public/data/bihar-districts.geojson` - already generated in this repo,
re-run only if you want to refresh it).

### 6. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` (landing page) and
`http://localhost:3000/dashboard` (policymaker dashboard).

`vercel dev` also works once the Vercel CLI is installed and linked
(`npx vercel dev`), reading the same `.env.local`, per the plan's local-dev
requirement.

### 7. Exercise the intake -> processing -> scoring pipeline locally

Simulate a Twilio SMS webhook with curl (no real Twilio account needed,
since `TWILIO_VALIDATE_SIGNATURE=false` in local dev):

```bash
curl -X POST http://localhost:3000/api/webhooks/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=+919876543210" \
  --data-urlencode "Body=My name is Suresh Yadav. The hand pump in Barh, Patna has been broken for two weeks, no drinking water."
```

This persists the raw submission to the restricted `intake_submissions`
table and enqueues a job. Trigger the worker to process the next queued
job:

```bash
curl -X POST http://localhost:3000/api/worker/process
```

(Note: this step requires `GEMINI_API_KEY` to be set to a real key to
succeed end-to-end, since the worker calls Gemini for structured
extraction - see "What's real, what's simulated, what's unverified" above.
Without a real key, the request will complete with `{"status":"failed"}`
and a clear error logged/recorded rather than crashing, per C7's
acceptance criteria.)

Recompute hotspot scores and view the dashboard:

```bash
curl -X POST http://localhost:3000/api/hotspots
```

Then reload `http://localhost:3000/dashboard`.

### 8. Twilio + ngrok (for real webhook delivery)

To receive real Twilio Voice/SMS/WhatsApp webhooks against your local
server: run `ngrok http 3000`, set `PUBLIC_BASE_URL` in `.env.local` to the
ngrok HTTPS URL, set `TWILIO_VALIDATE_SIGNATURE=true` and fill in real
`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`, then point the Twilio
console's webhook URLs (Voice number's recording-status-callback, SMS
number's "a message comes in", WhatsApp sender's webhook) at
`<ngrok-url>/api/webhooks/voice`, `/sms`, `/whatsapp` respectively. This
was **not** exercised against a real Twilio account in this build session
(see above); the routes are code-complete and were tested via the curl
method in step 7 instead.

## Tests

```bash
npm test
```

Runs the full Vitest suite:
- Unit tests (`tests/anonymize.test.ts`, `tests/spam.test.ts`,
  `tests/scoring.test.ts`) - pure logic, no DB required.
- Integration test (`tests/integration/webhook-flow.test.ts`) - requires
  the local Docker Postgres from steps 2-4 above to be running and
  migrated; auto-skips (with a console warning) if `DATABASE_URL` isn't
  reachable, so `npm test` never hard-fails just because Docker isn't
  running, but the real assertions only execute against a real database.

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # next build (production build + type/lint check)
```

## Project structure

```
app/                  Next.js App Router: pages + API route handlers
  api/webhooks/        Twilio Voice/SMS/WhatsApp intake routes (C5)
  api/worker/process/  Queue-invoked async processing worker (C7)
  api/hotspots/        Hotspot list/detail/rationale/action routes (C10-C12)
  api/debug/           Anonymization before/after sample route (C8)
  dashboard/           Policymaker dashboard page (C13)
components/           Dashboard React components (map, table, panels)
lib/                  Core domain logic (db, anonymize, spam, scoring,
                       gemini, queue, twilio, intake, worker, impact)
migrations/           Numbered SQL migrations (C3) - see SCHEMA.md
scripts/
  migrate.ts           Migration runner
  ingest/              Census/NFHS/PMGSY ingestion scripts (C4)
tests/                 Vitest unit + integration tests (C14)
docs/                  Dataset provenance, Gemini spike status
public/data/           Real Bihar district-boundary GeoJSON (map layer)
```

## Demo script (anonymization + impact-tracking walkthrough)

1. Run `npm run dev`, open `/dashboard`. It loads with real Bihar
   reference data but no citizen submissions yet (run ingestion + a couple
   of curl-simulated submissions per steps 5/7 above first, then
   `POST /api/hotspots` to compute scores, for a populated demo).
2. Point at the **Anonymization debug view** panel: click "Show AFTER" /
   "Show BEFORE" to toggle between a real submission's raw intake-only
   record (plaintext phone, un-redacted text, precise GPS if present) and
   its anonymized clean record (salted phone hash, PII-scrubbed
   description, district-level location only). See `lib/anonymize.ts` and
   `app/api/debug/anonymization-sample/route.ts`.
3. Click a row in the ranked hotspot table (or a district on the map) to
   open the **drill-down detail panel**: shows the underlying anonymized
   citizen requests for that district+category, with duplicate/burst
   flags visible.
4. Click **"Generate policymaker rationale"** to call Gemini 2.5 Pro for a
   written explanation referencing that hotspot's actual figures (requires
   a real `GEMINI_API_KEY`).
5. Click **"Mark as funded/actioned + trigger re-engagement"**: records an
   `impact_actions` row with a timestamp, simulates a follow-up prompt to
   citizens who reported in that district+category (their simulated
   replies flow back through the real intake -> worker -> scoring
   pipeline), and recomputes the district+category's score as a new
   "post-action" wave. The panel then shows the before/after composite
   score side by side.

## Known caveats (see docs/dataset-provenance.md and docs/gemini-audio-spike.md for full detail)

- Census 2011 is real but 15 years stale - a stated, expected caveat, not
  a bug.
- Two reference-table fields are populated from a *disclosed proxy*
  indicator/unit rather than the literal field named in the schema
  (healthcare-facility-access uses NFHS-5's institutional-births% as a
  proxy; PMGSY "investment" is total proposed road length in km, not
  rupees) - both are flagged in `docs/dataset-provenance.md` and
  `SCHEMA.md`.
- A few reference columns (`population_density`, `rural_population_pct`,
  `sc_st_population_pct`, `pmgsy_habitations_connected`,
  `pmgsy_roads_completed`) are `NULL` for all districts - the accessed
  open-data mirrors didn't carry those specific fields in this session.
- The Gemini native-audio path (C6) has not been spike-tested against real
  audio in this session - see `docs/gemini-audio-spike.md`.
- Twilio, Upstash, and Gemini integrations are code-complete but
  unverified against their live services in this session (no credentials
  provisioned in this build environment).
