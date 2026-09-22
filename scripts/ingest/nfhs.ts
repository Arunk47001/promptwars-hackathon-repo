/**
 * C4 ingestion script: NFHS-5 (National Family Health Survey, 2019-21)
 * district factsheet infrastructure-access indicators, filtered to the
 * demo state (Karnataka).
 *
 * Source (see docs/dataset-provenance.md): pratapvardhan/NFHS-5 on GitHub,
 * a long-format CSV compilation of the official NFHS-5 district factsheets
 * published by India's Ministry of Health & Family Welfare / IIPS
 * (rchiips.org/nfhs/), fetched live over HTTPS each run.
 *
 * Maps four real NFHS-5 indicators onto ref_infrastructure:
 *   - Indicator 7  -> households_with_electricity_pct
 *   - Indicator 8  -> households_with_improved_water_pct
 *   - Indicator 9  -> households_with_improved_sanitation_pct
 *   - Indicator 42 ("Institutional births (%)") -> households_near_health_facility_pct
 *
 * Caveat (disclosed): NFHS-5's district factsheets do not publish a direct
 * "% of households within 5km of a health facility" figure. Indicator 42
 * (institutional births %) is used as the closest available real,
 * district-level healthcare-access proxy in this dataset. This is a
 * disclosed substitution of *which real indicator* maps to that column,
 * not fabricated data - see docs/dataset-provenance.md.
 */
import path from "node:path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Client } from "pg";
import { DEMO_STATE, NFHS_STATE_NAME, getCanonicalDisplayName } from "./config";

const ROOT = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const NFHS_CSV_URL =
  "https://raw.githubusercontent.com/pratapvardhan/NFHS-5/master/NFHS-5-Districts.csv";

const INDICATOR_PREFIXES = {
  electricity: "7. Population living in households with electricity",
  water: "8. Population living in households with an improved drinking-water source",
  sanitation: "9. Population living in households that use an improved sanitation facility",
  healthAccessProxy: "42. Institutional births"
};

interface NfhsRow {
  State: string;
  District: string;
  Indicator: string;
  "NFHS-5": string;
}

export async function fetchNfhsRowsForDemoState() {
  const res = await fetch(NFHS_CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch NFHS-5 CSV: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  const rows: NfhsRow[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true
  });

  const byDistrict = new Map<
    string,
    {
      district: string;
      electricity?: number;
      water?: number;
      sanitation?: number;
      healthAccessProxy?: number;
    }
  >();

  for (const r of rows) {
    if (r.State?.trim() !== NFHS_STATE_NAME) continue;
    const district = r.District.trim();
    if (!byDistrict.has(district)) {
      byDistrict.set(district, { district });
    }
    const entry = byDistrict.get(district)!;
    const value = Number(r["NFHS-5"]);
    if (Number.isNaN(value)) continue;

    if (r.Indicator.startsWith(INDICATOR_PREFIXES.electricity)) {
      entry.electricity = value;
    } else if (r.Indicator.startsWith(INDICATOR_PREFIXES.water)) {
      entry.water = value;
    } else if (r.Indicator.startsWith(INDICATOR_PREFIXES.sanitation)) {
      entry.sanitation = value;
    } else if (r.Indicator.startsWith(INDICATOR_PREFIXES.healthAccessProxy)) {
      entry.healthAccessProxy = value;
    }
  }

  return Array.from(byDistrict.values());
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log(
    `Fetching NFHS-5 district factsheet indicators for ${DEMO_STATE} from ${NFHS_CSV_URL} ...`
  );
  const rows = await fetchNfhsRowsForDemoState();
  if (rows.length === 0) {
    throw new Error(
      `No NFHS-5 rows found for state "${NFHS_STATE_NAME}" - check source availability/format.`
    );
  }
  console.log(`Fetched ${rows.length} ${DEMO_STATE} districts from NFHS-5.`);

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const row of rows) {
      const districtKey = getCanonicalDisplayName(row.district);
      await client.query(
        `INSERT INTO ref_infrastructure
           (district, state, households_with_electricity_pct, households_with_improved_water_pct,
            households_with_improved_sanitation_pct, households_near_health_facility_pct,
            source, source_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,2021)
         ON CONFLICT (district) DO UPDATE SET
           state = EXCLUDED.state,
           households_with_electricity_pct = EXCLUDED.households_with_electricity_pct,
           households_with_improved_water_pct = EXCLUDED.households_with_improved_water_pct,
           households_with_improved_sanitation_pct = EXCLUDED.households_with_improved_sanitation_pct,
           households_near_health_facility_pct = EXCLUDED.households_near_health_facility_pct,
           source = EXCLUDED.source,
           source_year = EXCLUDED.source_year`,
        [
          districtKey,
          DEMO_STATE,
          row.electricity ?? null,
          row.water ?? null,
          row.sanitation ?? null,
          row.healthAccessProxy ?? null,
          "NFHS-5 (2019-21) district factsheets (via github.com/pratapvardhan/NFHS-5, citing rchiips.org/nfhs); health-facility-access column uses institutional-births% as a documented proxy indicator"
        ]
      );
    }
    console.log(`Upserted ${rows.length} rows into ref_infrastructure.`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("NFHS-5 ingestion failed:", err);
    process.exit(1);
  });
}
