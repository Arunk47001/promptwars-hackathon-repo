/**
 * Shared config for the C4 ingestion scripts.
 *
 * Demo geographic scope: BIHAR.
 *
 * Why Bihar (per the plan's "scoping note" - a build-time convenience, not
 * a decision needing sign-off): of the states checked against the three
 * real datasets actually reachable in this build environment (see
 * docs/dataset-provenance.md for exact sources), Bihar had complete,
 * consistent district lists across all three sources without extra name
 * reconciliation:
 *   - Census 2011 district table: 38 Bihar districts.
 *   - NFHS-5 district factsheet CSV: 38 Bihar districts (exact name match
 *     to the Census list after case/whitespace normalization).
 *   - PMGSY open habitation/road-proposal data: a Bihar-specific export
 *     (Bihar.zip) is published directly, with per-district habitation and
 *     proposed-road records.
 * That three-way clean overlap is what the plan's C4 acceptance criteria
 * asks for ("cleanest/most complete coverage"), so Bihar was chosen over
 * scanning all 36 states/UTs for an even-cleaner match given the build
 * time available.
 */
export const DEMO_STATE = "Bihar";

/** Census 2011 CSV uses upper-case state names. */
export const CENSUS_STATE_NAME = "BIHAR";

/** NFHS-5 CSV uses title-case state names. */
export const NFHS_STATE_NAME = "Bihar";

/** PMGSY per-state data export file name (see datameet/pmgsy-geosadak). */
export const PMGSY_STATE_FILE = "Bihar";

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
 * Authoritative list of Bihar's 38 districts, spelled exactly as the
 * Census 2011 and NFHS-5 sources spell them (the two sources agree with
 * each other exactly on spelling). This is a static, hardcoded lookup
 * (not learned at runtime from whichever ingestion script happens to run
 * first) so that census.ts, nfhs.ts, and pmgsy.ts always write the same
 * `district` join-key value to their respective reference tables
 * regardless of which script runs, or in what order, or in separate
 * process invocations (`npm run ingest:census` vs `npm run ingest`).
 */
export const BIHAR_DISTRICTS = [
  "Araria",
  "Arwal",
  "Aurangabad",
  "Banka",
  "Begusarai",
  "Bhagalpur",
  "Bhojpur",
  "Buxar",
  "Darbhanga",
  "Gaya",
  "Gopalganj",
  "Jamui",
  "Jehanabad",
  "Kaimur (Bhabua)",
  "Katihar",
  "Khagaria",
  "Kishanganj",
  "Lakhisarai",
  "Madhepura",
  "Madhubani",
  "Munger",
  "Muzaffarpur",
  "Nalanda",
  "Nawada",
  "Pashchim Champaran",
  "Patna",
  "Purba Champaran",
  "Purnia",
  "Rohtas",
  "Saharsa",
  "Samastipur",
  "Saran",
  "Sheikhpura",
  "Sheohar",
  "Sitamarhi",
  "Siwan",
  "Supaul",
  "Vaishali"
];

const CANONICAL_DISPLAY_NAMES = new Map<string, string>(
  BIHAR_DISTRICTS.map((name) => [normalizeDistrictName(name), name])
);

/**
 * Several of the real open-data sources used here (PMGSY's MasterData.xls
 * lookup, and the datameet/indian-district-boundaries topojson used for
 * the dashboard map) spell a handful of Bihar district names differently
 * from the Census 2011 / NFHS-5 sources (which agree with each other
 * exactly): two are literal English-vs-Hindi-transliteration translations
 * of direction ("East"/"West" vs "Purba"/"Pashchim"), one is an alternate
 * spelling ("Jahanabad" vs "Jehanabad"), one is a parenthetical/spacing
 * alternate name ("Chapra(Saran)" vs "Saran"), and one drops a vowel from
 * the parenthetical qualifier ("Kaimur Bhabhua" vs "Kaimur (Bhabua)").
 * These are real, known alternate names/spellings for the same districts
 * (confirmed by cross-checking district counts, population, and geometry
 * against the Census/NFHS district list), not a data-quality issue this
 * build introduced - reconciled centrally here so every source (census.ts,
 * nfhs.ts, pmgsy.ts, prepare-district-boundaries.ts) joins on the same key.
 */
const EXTERNAL_DISTRICT_NAME_ALIASES: Record<string, string> = {
  "EAST CHAMPARAN": "PURBA CHAMPARAN",
  "WEST CHAMPARAN": "PASHCHIM CHAMPARAN",
  JAHANABAD: "JEHANABAD",
  "CHAPRA SARAN": "SARAN",
  CHAPRA: "SARAN",
  "KAIMUR BHABHUA": "KAIMUR"
};

/**
 * Given any raw district-name spelling from any of the source datasets,
 * returns the canonical Census/NFHS-spelled display name to write into the
 * `district` column. Falls back to title-casing the normalized key for
 * any district not in the static Bihar list (should not happen for
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
