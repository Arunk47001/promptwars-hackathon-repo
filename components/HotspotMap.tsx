"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { HotspotRow } from "@/app/dashboard/types";
import { colorForScore, relativeSeverityLabel } from "@/lib/colorScale";
import "leaflet/dist/leaflet.css";

interface Props {
  hotspots: HotspotRow[];
  selectedCategory: string;
  onSelectDistrict: (district: string) => void;
}

/** Real Karnataka district polygons (see scripts/ingest/prepare-district-boundaries.ts). */
const GEOJSON_URL = "/data/karnataka-districts.geojson";

/**
 * Approximate geographic center of Karnataka (~15.3N, 75.7E), spanning
 * roughly 11.5N-18.5N and 74E-78.5E; the map's zoom level below is chosen
 * to keep this whole extent in frame.
 */
const KARNATAKA_CENTER: [number, number] = [15.3, 75.7];

// colorForScore/severityLabel (colorblind-safe single-hue scale, with
// "no variance" tie-handling) now live in lib/colorScale.ts so the new
// district-grid mosaic (see components/dashboard/DistrictGrid.tsx) shares
// the exact same logic instead of re-deriving its own ramp - see that
// module's docblock for the full rationale (unchanged from this file's
// original version, just relocated).
const severityLabel = relativeSeverityLabel;

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
      center={KARNATAKA_CENTER}
      zoom={6}
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
