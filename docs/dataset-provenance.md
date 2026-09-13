# Dataset Provenance (C4)

## Demo scope: Bihar

All three reference datasets are filtered to **Bihar** (38 districts).
Bihar was chosen because, of the sources actually reachable from this build
environment, it was the state with a complete, cleanly-joinable district
list across all three datasets without extensive manual name reconciliation
(a handful of known alternate spellings were still reconciled explicitly —
see `scripts/ingest/config.ts`'s `PMGSY_DISTRICT_NAME_ALIASES`). This is a
build-time convenience per the plan's scoping note, not a decision that
needed sign-off. The schema (`ref_demographics` / `ref_infrastructure` /
`ref_investment`, keyed on `district`) is national-shaped, so adding another
state later is a matter of re-running the ingestion scripts with a
different state filter, not a schema change.

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
  (`data/MasterData.xls` for the state/district ID lookup,
  `data/Habitation/Bihar.zip` and `data/Proposals/Bihar.zip` for the
  per-habitation and per-road-proposal shapefile attribute tables), which
  republishes the Ministry of Rural Development's official PMGSY open-data
  export from `https://geosadak-pmgsy.nic.in/opendata/` under India's
  Government Open Data License (attribution required; the citation in that
  repo's README is preserved here).
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
  single `IMS_YEAR = 2020` sanction batch, not a full sanctioned-vs.
  -completed historical ledger) — this is why several districts show `0`
  roads sanctioned in this batch even though PMGSY has been active in
  Bihar for two decades; it reflects the batch scoped by the accessed
  export, not "no PMGSY activity."

## Cross-dataset join-key reconciliation

Census 2011 and NFHS-5 agree with each other exactly on all 38 Bihar
district name spellings. PMGSY's `MasterData.xls` lookup spells four of
them differently (two are English-vs-transliteration direction names, one
is an alternate spelling, one is a parenthetical alternate name) — these
are real known alternate names for the same districts, confirmed by
population/count cross-checks, not a data-quality problem this build
introduced. They are reconciled explicitly in
`scripts/ingest/config.ts` (`PMGSY_DISTRICT_NAME_ALIASES`):

| PMGSY spelling | Census/NFHS spelling |
|---|---|
| East Champaran | Purba Champaran |
| West Champaran | Pashchim Champaran |
| Jahanabad | Jehanabad |
| Chapra(Saran) | Saran |

After reconciliation, all 38 Bihar districts join cleanly across
`ref_demographics`, `ref_infrastructure`, and `ref_investment` (verified:
`SELECT count(*) FROM ref_demographics` = `ref_infrastructure` =
`ref_investment` = 38, and an inner join across all three returns 38 rows).

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
