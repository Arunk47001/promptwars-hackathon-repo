# Dataset Provenance (C4)

## Demo scope: Karnataka

All three reference datasets are filtered to **Karnataka** (30 districts,
2011-Census vintage, pre-dating the 2018 Vijayanagara split from Bellary).
The schema (`ref_demographics` / `ref_infrastructure` / `ref_investment`,
keyed on `district`) is national-shaped, so scoping to a given state is a
data-content choice, not a schema change.

**Verification spike (run live on 2026-09-14)** confirmed Karnataka data is
available in each of the four open-data mirrors this ingestion pipeline
uses, before any of the ingestion scripts below were finalized:

| Source | URL fetched | Result |
|---|---|---|
| Census 2011 CSV mirror | `https://raw.githubusercontent.com/RajaBhavesh/India_Census_2011_Analysis_Using_Python/main/Project5/file.csv` | 200 OK; 30 rows with `State_name = "KARNATAKA"` |
| NFHS-5 CSV mirror | `https://raw.githubusercontent.com/pratapvardhan/NFHS-5/master/NFHS-5-Districts.csv` | 200 OK; 3,120 rows (30 districts x multiple indicators) with `State = "Karnataka"`, spelled identically to the Census list |
| PMGSY per-state export | `https://raw.githubusercontent.com/datameet/pmgsy-geosadak/master/data/Habitation/Karnataka.zip` and `.../Proposals/Karnataka.zip` | Both 200 OK; valid zip archives containing genuine `Habitation.dbf`/`Proposals.dbf` shapefile attribute tables (not HTML error pages or empty stubs) |
| District-boundary topojson | `https://raw.githubusercontent.com/datameet/indian-district-boundaries/master/topojson/state-wise/karnataka.json` | 200 OK; 30 district features, `year: "2011_c"` (Census 2011 vintage, consistent with the other sources) |

No substitute/alternate mirrors were needed for Karnataka — all four
sources publish Karnataka exports directly.

## How this data was actually obtained in this build session

This build environment has outbound internet access but no interactive
browser/session for data.gov.in's or censusindia.gov.in's own download
UIs (which typically require manual form navigation), and no NFHS/PMGSY
API credentials. Rather than fabricate figures, each ingestion script
fetches a **real, publicly-reachable, third-party open-data mirror** of
each official dataset live over HTTPS, and the exact source/mirror/caveats
are disclosed below and in each script's header comment. All figures
loaded into the database are real published statistics from these mirrors
— nothing was invented — but two disclosed substitutions were necessary
(see "Known gaps and substitutions" below) because certain exact fields
named in the task breakdown were not available in the mirrors reachable
in this session.

### 1. Census of India 2011 — district demographics

- **What's used**: `district`, `population`, `literacy_rate` (derived as
  `Literate / Population * 100` from the source's raw Literate/Population
  columns).
- **Source actually fetched**: `https://raw.githubusercontent.com/RajaBhavesh/India_Census_2011_Analysis_Using_Python/main/Project5/file.csv`
  — a third-party GitHub mirror of the widely-circulated Kaggle "India
  Census 2011 District-wise" dataset, itself compiled from the Census of
  India 2011 Primary Census Abstract tables (censusindia.gov.in).
- **Caveat carried forward from the plan (expected, not new)**: 2011 is
  the most recent full Indian census; this is real but stale (15 years
  old at build time) data, stated on stage per the plan's guidance, not
  hidden.
- **Known gap (disclosed, not fabricated)**: `population_density`,
  `rural_population_pct`, and `sc_st_population_pct` are left `NULL` in
  `ref_demographics`. The mirror fetched in this session does not carry
  district area (needed for density) or rural/urban or SC/ST population
  breakdowns. Populating these would require joining a second Census 2011
  table (e.g. the District Census Handbook or Primary Census Abstract's
  area/SC-ST tables) not fetched in this pass. The scoring engine (C10)
  does not currently use these columns, so this gap does not silently
  corrupt the hotspot score, but it does mean the dashboard cannot show a
  density/rural-share/SC-ST breakdown for now.

### 2. NFHS-5 — district infrastructure-access indicators

- **What's used**: `households_with_electricity_pct`,
  `households_with_improved_water_pct`,
  `households_with_improved_sanitation_pct`, and
  `households_near_health_facility_pct`.
- **Source actually fetched**:
  `https://raw.githubusercontent.com/pratapvardhan/NFHS-5/master/NFHS-5-Districts.csv`
  — a long-format CSV compilation of the official NFHS-5 (2019-21)
  district factsheets published by India's Ministry of Health & Family
  Welfare / International Institute for Population Sciences
  (`rchiips.org/nfhs/`), explicitly cited by that repo (including a DOI:
  `10.7910/DVN/42WNZF`).
- **Known substitution (disclosed)**: NFHS-5's public district factsheets
  do not publish a direct "% of households within Xkm of a health
  facility" figure. `households_near_health_facility_pct` is populated
  from NFHS-5 indicator **"42. Institutional births (%)"** instead — a
  real, district-level NFHS-5 healthcare-access indicator, used here as
  the closest available proxy for healthcare-facility access/utilization
  in this dataset, not a literal distance measure. This is a substitution
  of *which real indicator* is used, not invented data.

### 3. PMGSY — rural-road connectivity / "planned investment" signal

- **What's used**: `pmgsy_habitations_eligible` (count of habitation
  records per district), `pmgsy_roads_sanctioned` (count of road-proposal
  records per district), and `pmgsy_investment_sanctioned_lakh_rupees`.
- **Source actually fetched**: `https://github.com/datameet/pmgsy-geosadak`
  (`data/MasterData.xls` for the state/district ID lookup — 176 Karnataka
  rows keyed by `STATE_NAME = "Karnataka"`, 30 unique districts —
  `data/Habitation/Karnataka.zip` and `data/Proposals/Karnataka.zip` for
  the per-habitation and per-road-proposal shapefile attribute tables),
  which republishes the Ministry of Rural Development's official PMGSY
  open-data export from `https://geosadak-pmgsy.nic.in/opendata/` under
  India's Government Open Data License (attribution required; the
  citation in that repo's README is preserved here).
- **Known substitution (disclosed, important)**:
  `pmgsy_investment_sanctioned_lakh_rupees` is **not a rupee figure** in
  this build. The accessed open-data export does not carry a
  district-level sanctioned-rupee-amount field. Instead, this column holds
  the **total proposed road length in kilometres**, summed per district
  from the same real PMGSY proposals dataset, used as a real (if
  unit-mismatched) proxy for "existing planned investment scale" in the
  fusion/scoring layer (C10). The column name is left as-is to match the
  schema in the task breakdown, but both `SCHEMA.md` and this file flag
  the unit substitution explicitly so nobody mistakes the numbers for
  rupees.
- **Known gap (disclosed, not fabricated)**: `pmgsy_habitations_connected`
  and `pmgsy_roads_completed` are left `NULL`. The accessed open-data
  export's Habitation/Proposals tables do not carry a
  connected/completed-status field (the Proposals table used here is a
  single sanction batch, not a full sanctioned-vs.-completed historical
  ledger) — this is why some districts may show low road-sanction counts
  in this batch even though PMGSY has been active in Karnataka for two
  decades; it reflects the batch scoped by the accessed export, not "no
  PMGSY activity."

## Cross-dataset join-key reconciliation

Census 2011 and NFHS-5 agree with each other exactly on all 30 Karnataka
district name spellings (confirmed directly against both live CSV mirrors
during C1/C2). Two other sources spell some of them differently — these
are real, known alternate names for the same districts (confirmed by
district-count and geometry cross-checks during C1), not a data-quality
problem this build introduced. They are reconciled explicitly in
`scripts/ingest/config.ts` (`EXTERNAL_DISTRICT_NAME_ALIASES`):

PMGSY's `MasterData.xls` lookup uses abbreviated/alternate forms for 5
districts:

| PMGSY spelling | Census/NFHS spelling |
|---|---|
| Bangalore R | Bangalore Rural |
| Bangalore U | Bangalore |
| Chickballapur | Chikkaballapura |
| Chickmagalur | Chikmagalur |
| Ramnagar | Ramanagara |

The `datameet/indian-district-boundaries` topojson uses the post-2014
official Kannada-transliteration renames for 12 districts, rather than the
Census/NFHS English-era spellings:

| Boundary-topojson spelling | Census/NFHS spelling |
|---|---|
| Bagalkote | Bagalkot |
| Ballari | Bellary |
| Belagavi | Belgaum |
| Bengaluru | Bangalore |
| Bengaluru Rural | Bangalore Rural |
| Chamarajanagara | Chamarajanagar |
| Chikkamagaluru | Chikmagalur |
| Kalaburagi | Gulbarga |
| Mysuru | Mysore |
| Shivamogga | Shimoga |
| Tumakuru | Tumkur |
| Vijayapura | Bijapur |

After reconciliation, all 30 Karnataka districts join cleanly across
`ref_demographics`, `ref_infrastructure`, and `ref_investment` — verified
locally against the Docker Postgres instance on 2026-09-14: `SELECT
count(*) FROM ref_demographics` = `ref_infrastructure` = `ref_investment`
= 30, and an inner join across all three returns 30 rows. (See the coder
status report under `.squad/coder/` for the exact query output.)

## Live coverage now surfaced on the Data sources & provenance screen (2026-09-22)

As of the `redesign-dashboard-per-design-canvas` coder work
(`.squad/task/redesign-dashboard-per-design-canvas.md`, C7), the dashboard's
**Data sources & provenance** screen queries `count(*)` on
`ref_demographics`/`ref_infrastructure`/`ref_investment`/`clean_submissions`
live from `GET /api/data-sources`, rather than showing a static number.

Checking this against the environment's actual configured database (a
live Neon Postgres instance, not local Docker - see
`.squad/coder/redesign-dashboard-per-design-canvas.md` for why) surfaced a
real, previously-undisclosed data-hygiene gap: `ref_demographics` /
`ref_infrastructure` / `ref_investment` currently hold **38 rows each**, not
the 30 Karnataka rows this doc describes above - the extra rows are leftover
**Bihar**-named district rows from before the Karnataka rescope
(`district` is each table's primary key, and Bihar/Karnataka district names
don't collide, so re-running ingestion for Karnataka added 30 new rows
without removing the old 37-38 Bihar ones). `hotspot_scores` in this same
database is similarly still keyed on Bihar district names ("Gaya", "Patna")
from earlier test submissions, not Karnataka ones. This is a real, live
finding, not a redesign-introduced bug - the new Data sources screen simply
surfaces it instead of masking it behind a static count. Re-running
`npm run ingest` won't fix the leftover Bihar rows by itself (it upserts,
it doesn't delete); a one-time cleanup
(`DELETE FROM ref_demographics WHERE state = 'Bihar'`, similarly for the
other two reference tables) would be needed to make the live database
match this document's "30 Karnataka rows" claim exactly. Left for the
user's explicit go-ahead rather than run unprompted against a shared
database.

## Re-running ingestion

```bash
npm run ingest          # runs all three, in order
npm run ingest:census
npm run ingest:nfhs
npm run ingest:pmgsy
```

Each script fetches live from its source URL on every run (nothing is
cached/bundled as a static file in the repo) and upserts by `district`, so
re-running is safe/idempotent against a non-empty table.
