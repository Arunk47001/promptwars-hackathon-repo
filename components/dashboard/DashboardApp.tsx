"use client";

import { useCallback, useEffect, useState } from "react";
import type { HotspotRow } from "@/app/dashboard/types";
import { colors, fonts } from "@/lib/theme";
import { computeAlerts, type ImpactActionRow } from "@/lib/dashboardMetrics";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Toast from "./Toast";
import HotspotDrawer from "./HotspotDrawer";
import ExportModal from "./ExportModal";
import OverviewScreen from "./screens/OverviewScreen";
import HotspotExplorerScreen from "./screens/HotspotExplorerScreen";
import ImpactTrackingScreen from "./screens/ImpactTrackingScreen";
import DataSourcesScreen from "./screens/DataSourcesScreen";
import type { Role, Screen } from "./types";

/**
 * Top-level dashboard shell + screen router (C2 of
 * .squad/task/redesign-dashboard-per-design-canvas.md).
 *
 * Navigation is **client-side state** (a `screen` field on this
 * component), not separate Next.js routes - matching the design's own
 * `Component` class, which switches screens via `setState({ screen })`
 * rather than routing. Chosen over multi-route pages so the sidebar/header
 * shell, in-flight hotspot fetch, and drawer/export-modal overlay state
 * are all shared naturally across screens without prop-drilling through
 * route params or a separate global store, and so this component maps
 * directly onto the design's state machine for easy review against it.
 */
export default function DashboardApp() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [role, setRole] = useState<Role>("Policymaker");

  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const [selectedHotspot, setSelectedHotspot] = useState<HotspotRow | null>(null);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [filteredHotspots, setFilteredHotspots] = useState<HotspotRow[]>([]);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [toast, setToastMsg] = useState<string | null>(null);

  const [exportSource, setExportSource] = useState<
    | { kind: "hotspots" }
    | { kind: "impact"; actions: ImpactActionRow[] }
    | null
  >(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg((current) => (current === message ? null : current)), 2600);
  }, []);

  const loadHotspots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hotspots");
      const data = await res.json();
      setHotspots(data.hotspots ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  async function recomputeScores() {
    setRecomputing(true);
    try {
      const res = await fetch("/api/hotspots", { method: "POST" });
      const data = await res.json();
      await loadHotspots();
      showToast(`Scores recomputed — updated ${data.count ?? data.hotspots?.length ?? 0} hotspots`);
    } catch (err) {
      showToast(`Recompute failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRecomputing(false);
    }
  }

  function openHotspot(h: HotspotRow) {
    setSelectedHotspot(h);
    setAlertsOpen(false);
  }

  function goHotspots() {
    setScreen("hotspots");
    setAlertsOpen(false);
  }

  function goImpact() {
    setScreen("impact");
    setSelectedHotspot(null);
    setAlertsOpen(false);
  }

  const alerts = computeAlerts(hotspots, 5);
  const lastScoredAt =
    hotspots.length > 0
      ? hotspots.reduce((latest, h) => (h.computed_at > latest ? h.computed_at : latest), hotspots[0].computed_at)
      : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px minmax(0, 1fr)",
        minHeight: "100vh",
        background: colors.bg,
        fontFamily: fonts.sans
      }}
    >
      <div data-no-print="true">
        <Sidebar screen={screen} onNavigate={setScreen} role={role} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div data-no-print="true">
          <Header
            role={role}
            onRoleChange={setRole}
            lastScoredAt={lastScoredAt}
            alertsOpen={alertsOpen}
            onToggleAlerts={() => setAlertsOpen((v) => !v)}
            alerts={alerts}
          />
        </div>

        <main style={{ padding: "22px 24px 56px", minWidth: 0 }}>
          {screen === "overview" && (
            <OverviewScreen
              hotspots={hotspots}
              loading={loading}
              onOpenHotspot={openHotspot}
              onGoHotspots={goHotspots}
            />
          )}
          {screen === "hotspots" && (
            <HotspotExplorerScreen
              hotspots={hotspots}
              loading={loading}
              recomputing={recomputing}
              onRecompute={recomputeScores}
              onOpenHotspot={openHotspot}
              selectedId={selectedHotspot?.id ?? null}
              onOpenExport={() => setExportSource({ kind: "hotspots" })}
              category={category}
              onCategoryChange={setCategory}
              query={query}
              onQueryChange={setQuery}
              onFilteredChange={setFilteredHotspots}
            />
          )}
          {screen === "impact" && (
            <ImpactTrackingScreen
              onOpenExport={(actions) => setExportSource({ kind: "impact", actions })}
            />
          )}
          {screen === "data" && <DataSourcesScreen />}
        </main>
      </div>

      {selectedHotspot && (
        <HotspotDrawer
          hotspot={selectedHotspot}
          onClose={() => setSelectedHotspot(null)}
          onActioned={loadHotspots}
          onGoImpact={goImpact}
        />
      )}

      {exportSource &&
        (exportSource.kind === "hotspots" ? (
          <ExportModal
            source={{ kind: "hotspots", current: filteredHotspots, full: hotspots }}
            onClose={() => setExportSource(null)}
            onToast={showToast}
          />
        ) : (
          <ExportModal
            source={{ kind: "impact", current: exportSource.actions, full: exportSource.actions }}
            onClose={() => setExportSource(null)}
            onToast={showToast}
          />
        ))}

      <Toast message={toast} />
    </div>
  );
}
