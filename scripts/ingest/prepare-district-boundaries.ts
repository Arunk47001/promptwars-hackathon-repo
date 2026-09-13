/**
 * One-off prep script (part of C4/C13 support): converts the real Bihar
 * district-boundary TopoJSON (datameet/indian-district-boundaries) to
 * GeoJSON, renames each district's `district` property to the canonical
 * Census/NFHS spelling used elsewhere in this app (see
 * scripts/ingest/config.ts), and writes the result to
 * public/data/bihar-districts.geojson for the dashboard's React-Leaflet
 * choropleth map (C13) to load as a static asset.
 *
 * Source: https://raw.githubusercontent.com/datameet/indian-district-boundaries/master/topojson/state-wise/bihar.json
 * (2011 Census district boundaries, per that repo's `year: "2011_c"`
 * property - consistent with the Census 2011 vintage used elsewhere).
 *
 * Run with: npx tsx scripts/ingest/prepare-district-boundaries.ts
 */
import fs from "node:fs";
import path from "node:path";
import * as topojsonClient from "topojson-client";
import { getCanonicalDisplayName } from "./config";

const SOURCE_URL =
  "https://raw.githubusercontent.com/datameet/indian-district-boundaries/master/topojson/state-wise/bihar.json";
const OUTPUT_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "public",
  "data",
  "bihar-districts.geojson"
);

async function main() {
  console.log(`Fetching Bihar district boundaries from ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch topojson: ${res.status} ${res.statusText}`);
  }
  const topology = await res.json();
  const objectKey = Object.keys(topology.objects)[0];
  const geojson = topojsonClient.feature(topology, topology.objects[objectKey]) as any;

  for (const feature of geojson.features) {
    const rawName = feature.properties.district as string;
    feature.properties.district = getCanonicalDisplayName(rawName);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson));
  console.log(
    `Wrote ${geojson.features.length} district polygons to ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error("Failed to prepare district boundaries:", err);
  process.exit(1);
});
