import { DEMO_STATE, KARNATAKA_DISTRICTS } from "@/scripts/ingest/config";

/**
 * Real nation/region identifiers for the dashboard header (C2 of
 * .squad/task/redesign-dashboard-per-design-canvas.md).
 *
 * Sourced from the actual ingestion config (`scripts/ingest/config.ts`),
 * which is the same place the real ingestion scripts, scoring join, and
 * `HotspotMap`'s GeoJSON path already get "Karnataka" from - never a
 * hardcoded "Bihar" literal copied from the design file. If the demo scope
 * is re-scoped again in the future, updating `DEMO_STATE` there
 * automatically updates the header everywhere.
 */
export const NATION = "India";
export const NATION_CODE = "IND";
export const REGION = DEMO_STATE;

/**
 * Total districts in the current region, per the authoritative static
 * district list already used to reconcile every reference table's join key
 * (`scripts/ingest/config.ts`) - this is the real total district count for
 * the region, not just however many happen to have computed hotspot rows
 * yet (which can be fewer, e.g. before any citizen submissions exist for
 * every district).
 */
export const REGION_DISTRICT_COUNT = KARNATAKA_DISTRICTS.length;
