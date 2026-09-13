"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import HotspotTable from "@/components/HotspotTable";
import DetailPanel from "@/components/DetailPanel";
import AnonymizationToggle from "@/components/AnonymizationToggle";
import type { HotspotRow } from "./types";

// react-leaflet touches `window` at import time, so it must not be
// server-rendered.
const HotspotMap = dynamic(() => import("@/components/HotspotMap"), {
  ssr: false,
  loading: () => <div style={{ padding: "1rem" }}>Loading map...</div>
});

export default function DashboardPage() {
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HotspotRow | null>(null);
  const [category, setCategory] = useState("all");

  const loadHotspots = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/hotspots");
    const data = await res.json();
    setHotspots(data.hotspots ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(hotspots.map((h) => h.category)))],
    [hotspots]
  );

  const filtered = useMemo(
    () => hotspots.filter((h) => category === "all" || h.category === category),
    [hotspots, category]
  );

  async function recomputeScores() {
    setLoading(true);
    await fetch("/api/hotspots", { method: "POST" });
    await loadHotspots();
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Policymaker Dashboard — Bihar demand hotspots</h1>
      <p style={{ color: "#666" }}>
        Real citizen submissions fused with Census 2011 demographics, NFHS-5 infrastructure
        indicators, and PMGSY investment data (see docs/dataset-provenance.md).
      </p>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
        <label>
          Category:{" "}
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button onClick={recomputeScores} disabled={loading}>
          {loading ? "Loading..." : "Recompute hotspot scores"}
        </button>
        <span>{filtered.length} district+category hotspots</span>
      </div>

      {hotspots.length === 0 && !loading && (
        <p style={{ background: "#fff7ed", padding: "1rem", borderRadius: 8 }}>
          No hotspot scores yet. Run <code>npm run ingest</code> to load reference data, submit
          some test citizen requests via the webhook routes, process them via the worker route,
          then click &quot;Recompute hotspot scores&quot; above.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <HotspotMap
          hotspots={filtered}
          selectedCategory={category}
          onSelectDistrict={(district) => {
            const match = filtered.find((h) => h.district === district);
            if (match) setSelected(match);
          }}
        />
        <AnonymizationToggle />
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <h2>Ranked hotspots</h2>
        <HotspotTable hotspots={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
      </div>

      {selected && (
        <div style={{ marginTop: "1.5rem" }}>
          <DetailPanel hotspot={selected} onActioned={loadHotspots} />
        </div>
      )}
    </main>
  );
}
