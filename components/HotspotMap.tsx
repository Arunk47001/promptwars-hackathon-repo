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

function colorForScore(score: number | undefined, max: number, min: number): string {
  if (score === undefined) return "#e0e0e0";
  const range = max - min || 1;
  const t = Math.max(0, Math.min(1, (score - min) / range));
  // Low (blue-ish) -> high (red) heat scale, transparent enough to see basemap.
  const r = Math.round(255 * t);
  const g = Math.round(80 + 100 * (1 - t));
  const b = Math.round(255 * (1 - t));
  return `rgb(${r},${g},${b})`;
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
          layer.bindTooltip(
            `${district}${score !== undefined ? `: score ${score.toFixed(2)}` : " (no data)"}`
          );
          layer.on("click", () => onSelectDistrict(district));
        }}
      />
    </MapContainer>
  );
}
