"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { HotspotRow } from "@/app/dashboard/types";
import "leaflet/dist/leaflet.css";

interface Props {
  hotspots: HotspotRow[];
  selectedCategory: string;
  onSelectDistrict: (district: string) => void;
}

/** Real Bihar district polygons (see scripts/ingest/prepare-district-boundaries.ts). */
const GEOJSON_URL = "/data/bihar-districts.geojson";

const BIHAR_CENTER: [number, number] = [25.9, 85.6];

/**
 * Colorblind-safe single-hue sequential scale (light -> dark blue), per
 * .squad/designer/brics-citizen-infrastructure-platform.md's "Divergence
 * flag": composite score is a single sequential severity measure, not a
 * diverging good/bad axis, so it should never be encoded as a
 * red-green-blue hue interpolation (misreads as diverging, and isn't
 * distinguishable for red-green color-vision deficiencies). This ramps
 * lightness only, within one hue.
 */
function colorForScore(score: number | undefined, max: number, min: number): string {
  if (score === undefined) return "#e0e0e0";
  // When every scored district ties (no variance - e.g. only 1-2 distinct
  // district+category groups exist yet), there's no real "low" vs "high"
  // end of the range, so don't collapse everything to t=0 (which renders
  // as near-invisible on this light-to-dark scale) - use a visible mid
  // tone instead, so tied hotspots still stand out on the map.
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (score - min) / range));
  // Light blue (#eff6ff) -> dark blue (#1e3a8a), interpolated per channel.
  const light = { r: 0xef, g: 0xf6, b: 0xff };
  const dark = { r: 0x1e, g: 0x3a, b: 0x8a };
  const r = Math.round(light.r + (dark.r - light.r) * t);
  const g = Math.round(light.g + (dark.g - light.g) * t);
  const b = Math.round(light.b + (dark.b - light.b) * t);
  return `rgb(${r},${g},${b})`;
}

function severityLabel(score: number | undefined, max: number, min: number): string {
  if (score === undefined) return "no data";
  const range = max - min;
  const t = range === 0 ? 0.5 : Math.max(0, Math.min(1, (score - min) / range));
  if (t >= 2 / 3) return "high severity";
  if (t >= 1 / 3) return "medium severity";
  return "low severity";
}

export default function HotspotMap({ hotspots, selectedCategory, onSelectDistrict }: Props) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then(setGeoData)
      .catch((err) => console.error("Failed to load district boundaries:", err));
  }, []);

  const scoresByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hotspots) {
      if (selectedCategory !== "all" && h.category !== selectedCategory) continue;
      const existing = map.get(h.district);
      if (existing === undefined || h.composite_score > existing) {
        map.set(h.district, h.composite_score);
      }
    }
    return map;
  }, [hotspots, selectedCategory]);

  const { max, min } = useMemo(() => {
    const values = Array.from(scoresByDistrict.values());
    return {
      max: values.length ? Math.max(...values) : 1,
      min: values.length ? Math.min(...values) : 0
    };
  }, [scoresByDistrict]);

  if (!geoData) {
    return <div style={{ padding: "1rem" }}>Loading map...</div>;
  }

  return (
    <MapContainer
      center={BIHAR_CENTER}
      zoom={7}
      style={{ height: 480, width: "100%", borderRadius: 8 }}
      data-testid="hotspot-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={geoData}
        style={(feature?: Feature) => {
          const district = feature?.properties?.district as string | undefined;
          const score = district ? scoresByDistrict.get(district) : undefined;
          return {
            fillColor: colorForScore(score, max, min),
            fillOpacity: 0.65,
            color: "#333",
            weight: 1
          };
        }}
        onEachFeature={(feature, layer) => {
          const district = feature.properties?.district as string;
          const score = scoresByDistrict.get(district);
          const severity = severityLabel(score, max, min);
          layer.bindTooltip(
            `${district}${
              score !== undefined ? `: score ${score.toFixed(2)} (${severity})` : " (no data)"
            }`
          );
          layer.on("click", () => onSelectDistrict(district));
        }}
      />
    </MapContainer>
  );
}
