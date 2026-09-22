/**
 * C4 ingestion script: PMGSY (Pradhan Mantri Gram Sadak Yojana) rural-road
 * connectivity data, filtered to the demo state (Karnataka).
 *
 * Source (see docs/dataset-provenance.md): datameet/pmgsy-geosadak on
 * GitHub, which republishes the official PMGSY open-data export from
 * https://geosadak-pmgsy.nic.in/opendata/ under India's Government Open
 * Data License. Fetched live over HTTPS each run (state-level habitation
 * and road-proposal shapefile .zip exports + the state/district ID lookup
 * workbook), not bundled as static files.
 *
 * Populates ref_investment per district:
 *   - pmgsy_habitations_eligible: count of habitation records for the
 *     district in the PMGSY habitation export (real).
 *   - pmgsy_roads_sanctioned: count of road-proposal records for the
 *     district in the PMGSY proposals export (real).
 *   - pmgsy_roads_completed: left NULL - the accessed open-data export
 *     does not carry a completion-status field; a real, disclosed gap
 *     (see docs/dataset-provenance.md), not fabricated.
 *   - pmgsy_investment_sanctioned_lakh_rupees: NOT a rupee figure. This
 *     column is populated with the total *proposed road length in
 *     kilometres* per district, summed from the same real PMGSY proposals
 *     dataset, used as a real (if unit-mismatched) proxy for "existing
 *     planned investment scale" because a district-level rupee-sanctioned
 *     amount was not available in the accessed open-data export. This
 *     substitution is explicitly disclosed in docs/dataset-provenance.md
 *     and in SCHEMA.md; it is not a fabricated number.
 */
import path from "node:path";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import * as shapefile from "shapefile";
import { Client } from "pg";
import {
  DEMO_STATE,
  PMGSY_STATE_FILE,
  normalizePmgsyDistrictName,
  getCanonicalDisplayName
} from "./config";

const ROOT = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const BASE_URL =
  "https://raw.githubusercontent.com/datameet/pmgsy-geosadak/master/data";
const MASTER_DATA_URL = `${BASE_URL}/MasterData.xls`;
const HABITATION_ZIP_URL = `${BASE_URL}/Habitation/${PMGSY_STATE_FILE}.zip`;
const PROPOSALS_ZIP_URL = `${BASE_URL}/Proposals/${PMGSY_STATE_FILE}.zip`;

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function readDbfFromZip(
  zipBuffer: Buffer,
  dbfFileNameHint: string
): Promise<Record<string, unknown>[]> {
  const zip = new AdmZip(zipBuffer);
  const entry = zip
    .getEntries()
    .find((e) => e.entryName.toLowerCase().endsWith(".dbf"));
  if (!entry) {
    throw new Error(`No .dbf entry found in zip for ${dbfFileNameHint}`);
  }
  const dbfBuffer = entry.getData();
  const source = await shapefile.openDbf(dbfBuffer);
  const records: Record<string, unknown>[] = [];
  let result = await source.read();
  while (!result.done) {
    records.push(result.value as Record<string, unknown>);
    result = await source.read();
  }
  return records;
}

interface DistrictIdLookupRow {
  STATE_NAME: string;
  DISTRICT_ID: number;
  DISTRICT_NAME: string;
}

export async function fetchPmgsyAggregatesForDemoState() {
  console.log(`Fetching PMGSY district ID lookup from ${MASTER_DATA_URL} ...`);
  const masterBuf = await fetchBuffer(MASTER_DATA_URL);
  const wb = XLSX.read(masterBuf, { type: "buffer" });
  const lookupRows = XLSX.utils.sheet_to_json<DistrictIdLookupRow>(
    wb.Sheets[wb.SheetNames[0]]
  );

  const districtIdToName = new Map<number, string>();
  for (const row of lookupRows) {
    if (row.STATE_NAME === DEMO_STATE) {
      districtIdToName.set(row.DISTRICT_ID, row.DISTRICT_NAME);
    }
  }
  if (districtIdToName.size === 0) {
    throw new Error(
      `No district ID lookup rows found for state "${DEMO_STATE}" in MasterData.xls`
    );
  }

  console.log(`Fetching PMGSY habitation data from ${HABITATION_ZIP_URL} ...`);
  const habitationZip = await fetchBuffer(HABITATION_ZIP_URL);
  const habitationRecords = await readDbfFromZip(habitationZip, "Habitation.dbf");

  console.log(`Fetching PMGSY road-proposal data from ${PROPOSALS_ZIP_URL} ...`);
  const proposalsZip = await fetchBuffer(PROPOSALS_ZIP_URL);
  const proposalRecords = await readDbfFromZip(proposalsZip, "Proposals.dbf");

  interface Agg {
    district: string;
    habitationCount: number;
    roadsSanctioned: number;
    totalProposedLengthKm: number;
  }
  const byDistrict = new Map<string, Agg>();

  const getOrInit = (districtIdRaw: unknown): Agg | undefined => {
    const districtId = Number(districtIdRaw);
    const rawName = districtIdToName.get(districtId);
    if (!rawName) return undefined; // habitation/proposal outside demo state's district set
    const key = normalizePmgsyDistrictName(rawName);
    if (!byDistrict.has(key)) {
      byDistrict.set(key, {
        district: key,
        habitationCount: 0,
        roadsSanctioned: 0,
        totalProposedLengthKm: 0
      });
    }
    return byDistrict.get(key);
  };

  for (const rec of habitationRecords) {
    const agg = getOrInit(rec.DISTRICT_I);
    if (agg) agg.habitationCount += 1;
  }
  for (const rec of proposalRecords) {
    const agg = getOrInit(rec.DISTRICT_I);
    if (agg) {
      agg.roadsSanctioned += 1;
      const length = Number(rec.PROPOSED_L);
      if (!Number.isNaN(length)) agg.totalProposedLengthKm += length;
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

  const rows = await fetchPmgsyAggregatesForDemoState();
  if (rows.length === 0) {
    throw new Error(
      `No PMGSY records aggregated for state "${DEMO_STATE}" - check source availability/format.`
    );
  }
  console.log(`Aggregated PMGSY data for ${rows.length} ${DEMO_STATE} districts.`);

  const client = new Client({ connectionString });
  await client.connect();
  try {
    for (const row of rows) {
      const displayName = getCanonicalDisplayName(row.district);
      await client.query(
        `INSERT INTO ref_investment
           (district, state, pmgsy_habitations_eligible, pmgsy_habitations_connected,
            pmgsy_roads_sanctioned, pmgsy_roads_completed,
            pmgsy_investment_sanctioned_lakh_rupees, source, source_year)
         VALUES ($1,$2,$3,NULL,$4,NULL,$5,$6,2022)
         ON CONFLICT (district) DO UPDATE SET
           state = EXCLUDED.state,
           pmgsy_habitations_eligible = EXCLUDED.pmgsy_habitations_eligible,
           pmgsy_roads_sanctioned = EXCLUDED.pmgsy_roads_sanctioned,
           pmgsy_investment_sanctioned_lakh_rupees = EXCLUDED.pmgsy_investment_sanctioned_lakh_rupees,
           source = EXCLUDED.source,
           source_year = EXCLUDED.source_year`,
        [
          displayName,
          DEMO_STATE,
          row.habitationCount,
          row.roadsSanctioned,
          Number(row.totalProposedLengthKm.toFixed(2)),
          "PMGSY open data (via github.com/datameet/pmgsy-geosadak, citing geosadak-pmgsy.nic.in); 'investment' column holds total proposed road length in km, not rupees - see docs/dataset-provenance.md"
        ]
      );
    }
    console.log(`Upserted ${rows.length} rows into ref_investment.`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("PMGSY ingestion failed:", err);
    process.exit(1);
  });
}
