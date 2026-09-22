/**
 * C4 ingestion script: Census of India 2011 district-level demographics,
 * filtered to the demo state (Karnataka).
 *
 * Source (see docs/dataset-provenance.md for full citation/caveats): a
 * third-party GitHub mirror of the well-known Kaggle "India Census 2011
 * District-wise" dataset (originally compiled from censusindia.gov.in
 * primary-census-abstract tables). Fetched live over HTTPS each run, not
 * bundled as a static file, so re-running this script pulls the current
 * mirror contents.
 *
 * Populates ref_demographics.population / literacy_rate from real 2011
 * Census figures. population_density, rural_population_pct, and
 * sc_st_population_pct are left NULL: the accessed mirror does not carry
 * area (for density) or rural/urban or SC/ST breakdowns, and no
 * corroborated real source for those specific fields was fetched in this
 * pass. This is a stated, disclosed gap (see docs/dataset-provenance.md),
 * not fabricated data.
 */
import path from "node:path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Client } from "pg";
import { CENSUS_STATE_NAME, DEMO_STATE, getCanonicalDisplayName } from "./config";

const ROOT = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const CENSUS_CSV_URL =
  "https://raw.githubusercontent.com/RajaBhavesh/India_Census_2011_Analysis_Using_Python/main/Project5/file.csv";

interface CensusRow {
  District_code: string;
  State_name: string;
  District_name: string;
  Population: string;
  Literate: string;
}

export async function fetchCensusRowsForDemoState(): Promise<
  Array<{ district: string; population: number; literacyRate: number }>
> {
  const res = await fetch(CENSUS_CSV_URL);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Census 2011 CSV: ${res.status} ${res.statusText}`
    );
  }
  const csvText = await res.text();
  const rows: CensusRow[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true
  });

  return rows
    .filter((r) => r.State_name?.trim().toUpperCase() === CENSUS_STATE_NAME)
    .map((r) => {
      const population = Number(r.Population);
      const literate = Number(r.Literate);
      return {
        district: r.District_name.trim(),
        population,
        literacyRate: population > 0 ? (literate / population) * 100 : 0
      };
    });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log(
    `Fetching Census 2011 district demographics for ${DEMO_STATE} from ${CENSUS_CSV_URL} ...`
  );
  const rows = await fetchCensusRowsForDemoState();
  if (rows.length === 0) {
    throw new Error(
      `No Census rows found for state "${CENSUS_STATE_NAME}" - check source availability/format.`
    );
  }
  console.log(`Fetched ${rows.length} ${DEMO_STATE} districts from Census 2011.`);

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const row of rows) {
      const districtKey = getCanonicalDisplayName(row.district);
      await client.query(
        `INSERT INTO ref_demographics
           (district, state, population, population_density, rural_population_pct,
            literacy_rate, sc_st_population_pct, source, source_year)
         VALUES ($1,$2,$3,NULL,NULL,$4,NULL,$5,2011)
         ON CONFLICT (district) DO UPDATE SET
           state = EXCLUDED.state,
           population = EXCLUDED.population,
           literacy_rate = EXCLUDED.literacy_rate,
           source = EXCLUDED.source,
           source_year = EXCLUDED.source_year`,
        [
          districtKey,
          DEMO_STATE,
          row.population,
          Number(row.literacyRate.toFixed(2)),
          "Census of India 2011 (via github.com/RajaBhavesh mirror of Kaggle district dataset)"
        ]
      );
    }
    console.log(`Upserted ${rows.length} rows into ref_demographics.`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Census ingestion failed:", err);
    process.exit(1);
  });
}
