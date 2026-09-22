/**
 * Shared config for the C4 ingestion scripts.
 *
 * Demo geographic scope: KARNATAKA (re-scoped from Bihar; see
 * .squad/task/rescope-demo-state-bihar-to-karnataka.md and the "Demo
 * scope" section of docs/dataset-provenance.md for the full rationale and
 * source citations).
 *
 * Why Karnataka is viable in the same mirrors used for Bihar (confirmed by
 * the C1 verification spike, live-fetched on 2026-09-14): all four sources
 * previously scoped to Bihar also publish complete Karnataka data:
 *   - Census 2011 district table (RajaBhavesh mirror): 30 Karnataka rows
 *     (State_name = "KARNATAKA").
 *   - NFHS-5 district factsheet CSV (pratapvardhan/NFHS-5 mirror): 3120
 *     rows across the same 30 districts, spelled identically to the
 *     Census list.
 *   - PMGSY open habitation/road-proposal data (datameet/pmgsy-geosadak):
 *     state-specific exports Habitation/Karnataka.zip (200 OK, valid
 *     shapefile .dbf) and Proposals/Karnataka.zip (200 OK, valid
 *     shapefile .dbf) are published directly, plus 30 Karnataka rows in
 *     MasterData.xls's district-ID lookup (STATE_NAME = "Karnataka").
 *   - District-boundary topojson (datameet/indian-district-boundaries):
 *     topojson/state-wise/karnataka.json publishes 30 district features,
 *     year "2011_c" (2011 Census vintage, consistent with the other
 *     sources).
 * Unlike Bihar, Karnataka's PMGSY MasterData/boundary-topojson spellings
 * diverge from the Census/NFHS spellings in several real, disclosed ways
 * (abbreviated names in PMGSY; post-2014 Kannada-native renames in the
 * boundary topojson) - see EXTERNAL_DISTRICT_NAME_ALIASES below.
 */
export const DEMO_STATE = "Karnataka";

/** Census 2011 CSV uses upper-case state names. */
export const CENSUS_STATE_NAME = "KARNATAKA";

/** NFHS-5 CSV uses title-case state names. */
export const NFHS_STATE_NAME = "Karnataka";

/** PMGSY per-state data export file name (see datameet/pmgsy-geosadak). */
export const PMGSY_STATE_FILE = "Karnataka";

/**
 * Normalizes a district name for cross-dataset joining: upper-cases,
 * trims, collapses whitespace, and strips common punctuation/parenthetical
 * qualifiers (e.g. "Kaimur (Bhabua)" -> "KAIMUR") so the same real-world
 * district lines up across Census/NFHS/PMGSY spellings.
 */
export function normalizeDistrictName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Authoritative list of Karnataka's 30 districts (2011-Census vintage,
 * pre-dating the 2018 Vijayanagara split from Bellary), spelled exactly as
 * the Census 2011 and NFHS-5 sources spell them (the two sources agree
 * with each other exactly on spelling for all 30 - confirmed by the C1/C2
 * cross-check against the NFHS-5 mirror's Karnataka rows). This is a
 * static, hardcoded lookup (not learned at runtime from whichever
 * ingestion script happens to run first) so that census.ts, nfhs.ts, and
 * pmgsy.ts always write the same `district` join-key value to their
 * respective reference tables regardless of which script runs, or in what
 * order, or in separate process invocations (`npm run ingest:census` vs
 * `npm run ingest`).
 */
export const KARNATAKA_DISTRICTS = [
  "Bagalkot",
  "Bangalore",
  "Bangalore Rural",
  "Belgaum",
  "Bellary",
  "Bidar",
  "Bijapur",
  "Chamarajanagar",
  "Chikkaballapura",
  "Chikmagalur",
  "Chitradurga",
  "Dakshina Kannada",
  "Davanagere",
  "Dharwad",
  "Gadag",
  "Gulbarga",
  "Hassan",
  "Haveri",
  "Kodagu",
  "Kolar",
  "Koppal",
  "Mandya",
  "Mysore",
  "Raichur",
  "Ramanagara",
  "Shimoga",
  "Tumkur",
  "Udupi",
  "Uttara Kannada",
  "Yadgir"
];

const CANONICAL_DISPLAY_NAMES = new Map<string, string>(
  KARNATAKA_DISTRICTS.map((name) => [normalizeDistrictName(name), name])
);

/**
 * Two of the real open-data sources used here spell a number of Karnataka
 * district names differently from the Census 2011 / NFHS-5 sources (which
 * agree with each other exactly on all 30 names). Each entry below was
 * observed directly against live data during the C1 verification spike on
 * 2026-09-14, not guessed:
 *
 * PMGSY's MasterData.xls district-ID lookup uses abbreviated/alternate
 * forms for 5 districts:
 *   - "Bangalore R" / "Bangalore U" -> the Census names the same two
 *     districts "Bangalore Rural" and "Bangalore" respectively.
 *   - "Chickballapur" -> "Chikkaballapura" (spacing/spelling variant).
 *   - "Chickmagalur" -> "Chikmagalur" (extra "c").
 *   - "Ramnagar" -> "Ramanagara" (shortened form).
 *
 * The datameet/indian-district-boundaries topojson (despite being tagged
 * "2011_c" vintage, matching the Census district count of 30) uses the
 * post-2014 official Kannada-transliteration renames for 10 districts
 * rather than the Census/NFHS English-era spellings:
 *   - Bagalkote -> Bagalkot, Ballari -> Bellary, Belagavi -> Belgaum,
 *     Bengaluru -> Bangalore, Bengaluru Rural -> Bangalore Rural,
 *     Chamarajanagara -> Chamarajanagar, Chikkamagaluru -> Chikmagalur,
 *     Kalaburagi -> Gulbarga, Mysuru -> Mysore, Shivamogga -> Shimoga,
 *     Tumakuru -> Tumkur, Vijayapura -> Bijapur.
 *
 * These are real, known alternate names/spellings for the same districts
 * (confirmed by cross-checking district counts and geometry against the
 * Census/NFHS district list), not a data-quality issue this build
 * introduced - reconciled centrally here so every source (census.ts,
 * nfhs.ts, pmgsy.ts, prepare-district-boundaries.ts) joins on the same key.
 * No Bihar-era aliases (East/West Champaran, Jahanabad, Chapra, Kaimur)
 * carry over - this table was rebuilt from scratch for Karnataka.
 */
const EXTERNAL_DISTRICT_NAME_ALIASES: Record<string, string> = {
  "BANGALORE R": "BANGALORE RURAL",
  "BANGALORE U": "BANGALORE",
  CHICKBALLAPUR: "CHIKKABALLAPURA",
  CHICKMAGALUR: "CHIKMAGALUR",
  RAMNAGAR: "RAMANAGARA",
  BAGALKOTE: "BAGALKOT",
  BALLARI: "BELLARY",
  BELAGAVI: "BELGAUM",
  BENGALURU: "BANGALORE",
  "BENGALURU RURAL": "BANGALORE RURAL",
  CHAMARAJANAGARA: "CHAMARAJANAGAR",
  CHIKKAMAGALURU: "CHIKMAGALUR",
  KALABURAGI: "GULBARGA",
  MYSURU: "MYSORE",
  SHIVAMOGGA: "SHIMOGA",
  TUMAKURU: "TUMKUR",
  VIJAYAPURA: "BIJAPUR"
};

/**
 * Given any raw district-name spelling from any of the source datasets,
 * returns the canonical Census/NFHS-spelled display name to write into the
 * `district` column. Falls back to title-casing the normalized key for
 * any district not in the static Karnataka list (should not happen for
 * in-scope data; guards against a silent join failure turning into a
 * visibly-wrong new district rather than a silently-dropped row).
 */
export function getCanonicalDisplayName(rawOrNormalized: string): string {
  const normalized = /^[A-Z\s]+$/.test(rawOrNormalized)
    ? rawOrNormalized
    : normalizeDistrictName(rawOrNormalized);
  const key = EXTERNAL_DISTRICT_NAME_ALIASES[normalized] ?? normalized;
  return (
    CANONICAL_DISPLAY_NAMES.get(key) ??
    key.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Alias of getCanonicalDisplayName's normalization step, used by pmgsy.ts for its internal per-district aggregation map keys (see that file). */
export function normalizePmgsyDistrictName(raw: string): string {
  const normalized = normalizeDistrictName(raw);
  return EXTERNAL_DISTRICT_NAME_ALIASES[normalized] ?? normalized;
}
