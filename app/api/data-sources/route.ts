import fs from "node:fs/promises";
import path from "node:path";
import { query } from "@/lib/db";
import { REGION } from "@/lib/region";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SourceCard {
  kind: string;
  name: string;
  status: "Connected" | "No rows yet";
  detail: string;
  updated: string;
  coverage: string;
}

/**
 * GET /api/data-sources - real per-source coverage counts for the Data
 * sources & provenance screen (C7 of
 * .squad/task/redesign-dashboard-per-design-canvas.md). Every
 * `coverage`/`updated` value below is a live query against the actual
 * reference tables (or the actual GeoJSON file `HotspotMap` renders), never
 * copied from the design file's literal "28 / 28 districts" style numbers.
 * Source names/descriptions are real documentation text (see
 * `docs/dataset-provenance.md`), not fabricated data.
 */
export async function GET() {
  const [demographics, infrastructure, investment, intake] = await Promise.all([
    query<{ count: string; source: string | null; source_year: number | null }>(
      `SELECT count(*), max(source) AS source, max(source_year) AS source_year FROM ref_demographics`
    ),
    query<{ count: string; source: string | null; source_year: number | null }>(
      `SELECT count(*), max(source) AS source, max(source_year) AS source_year FROM ref_infrastructure`
    ),
    query<{ count: string; source: string | null; source_year: number | null }>(
      `SELECT count(*), max(source) AS source, max(source_year) AS source_year FROM ref_investment`
    ),
    query<{ count: string; last_created: string | null }>(
      `SELECT count(*), max(created_at) AS last_created FROM clean_submissions`
    )
  ]);

  const demoRow = demographics.rows[0];
  const infraRow = infrastructure.rows[0];
  const investRow = investment.rows[0];
  const intakeRow = intake.rows[0];

  let geometryFeatureCount: number | null = null;
  try {
    const geojsonPath = path.join(
      process.cwd(),
      "public",
      "data",
      `${REGION.toLowerCase()}-districts.geojson`
    );
    const raw = await fs.readFile(geojsonPath, "utf-8");
    const parsed = JSON.parse(raw) as { features?: unknown[] };
    geometryFeatureCount = Array.isArray(parsed.features) ? parsed.features.length : null;
  } catch {
    geometryFeatureCount = null;
  }

  const sources: SourceCard[] = [
    {
      kind: "Demographic",
      name: demoRow?.source || "Census of India 2011",
      status: Number(demoRow?.count ?? 0) > 0 ? "Connected" : "No rows yet",
      detail:
        "District population and literacy rate. Used as the demographic weight in scoring. Run `npm run ingest:census` to (re)load.",
      updated: demoRow?.source_year ? String(demoRow.source_year) : "not ingested yet",
      coverage: `${demoRow?.count ?? 0} / ${geometryFeatureCount ?? "?"} districts`
    },
    {
      kind: "Infrastructure index",
      name: infraRow?.source || "NFHS-5",
      status: Number(infraRow?.count ?? 0) > 0 ? "Connected" : "No rows yet",
      detail:
        "Household access to electricity, improved water, sanitation and (proxy) health-facility utilization. Drives the infrastructure-gap component. Run `npm run ingest:nfhs` to (re)load.",
      updated: infraRow?.source_year ? String(infraRow.source_year) : "not ingested yet",
      coverage: `${infraRow?.count ?? 0} / ${geometryFeatureCount ?? "?"} districts`
    },
    {
      kind: "Investment plans",
      name: investRow?.source || "PMGSY",
      status: Number(investRow?.count ?? 0) > 0 ? "Connected" : "No rows yet",
      detail:
        "Sanctioned road-proposal signal, subtracted as investment offset (unit note: this build's PMGSY column holds total proposed road length in km, not rupees - see docs/dataset-provenance.md). Run `npm run ingest:pmgsy` to (re)load.",
      updated: investRow?.source_year ? String(investRow.source_year) : "not ingested yet",
      coverage: `${investRow?.count ?? 0} / ${geometryFeatureCount ?? "?"} districts`
    },
    {
      kind: "Citizen intake",
      name: "Voice / SMS / WhatsApp gateway",
      status: Number(intakeRow?.count ?? 0) > 0 ? "Connected" : "No rows yet",
      detail:
        "Anonymized at intake, deduplicated and burst-flagged before fusion (see lib/anonymize.ts, lib/spam.ts). No raw PII crosses into this platform.",
      updated: intakeRow?.last_created
        ? new Date(intakeRow.last_created).toISOString()
        : "no submissions yet",
      coverage: `${intakeRow?.count ?? 0} anonymized submissions`
    },
    {
      kind: "Administrative geometry",
      name: `${REGION} district boundaries`,
      status: geometryFeatureCount !== null ? "Connected" : "No rows yet",
      detail:
        "District boundary polygons used to join every feed and (previously) render the choropleth map. Location is generalized to district (see SCHEMA.md's anonymization boundary).",
      updated: "static (fetched once by scripts/ingest/prepare-district-boundaries.ts)",
      coverage:
        geometryFeatureCount !== null
          ? `${geometryFeatureCount} district features`
          : "boundary file not found"
    }
  ];

  return Response.json({ region: REGION, sources });
}
