"use client";

import { useState } from "react";
import type { HotspotRow } from "@/app/dashboard/types";
import { colors, fonts } from "@/lib/theme";
import { REGION } from "@/lib/region";
import { hotspotsToCsv, impactActionsToCsv, type ImpactActionRow } from "@/lib/dashboardMetrics";

type ExportSource =
  | { kind: "hotspots"; current: HotspotRow[]; full: HotspotRow[] }
  | { kind: "impact"; current: ImpactActionRow[]; full: ImpactActionRow[] };

interface Props {
  source: ExportSource;
  onClose: () => void;
  onToast: (message: string) => void;
}

type Format = "CSV raw rows" | "PDF summary";
type Scope = "Current filtered view" | "Full region";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export modal (C8): CSV is a real client-side export of the currently
 * fetched/filtered real data (a genuine downloaded file, not a fake
 * "ready" toast). PDF is implemented as a real `window.print()`
 * print-formatted view (see the `@media print` rules in
 * `app/globals.css`, which hide the shell chrome and print whichever
 * screen is currently open) rather than a fabricated PDF generator - this
 * is disclosed to the user directly in the modal copy, not hidden.
 *
 * The design's third scope option, "Full nation", is intentionally
 * dropped: this build only has one region's data (Karnataka) - there is no
 * second real region to scope a "full nation" export to yet.
 */
export default function ExportModal({ source, onClose, onToast }: Props) {
  const [format, setFormat] = useState<Format>("CSV raw rows");
  const [scope, setScope] = useState<Scope>("Current filtered view");
  const [exporting, setExporting] = useState(false);

  const rowCount = (scope === "Current filtered view" ? source.current : source.full).length;
  const scopeNote =
    source.kind === "hotspots"
      ? `${REGION} · ${rowCount} hotspot${rowCount === 1 ? "" : "s"} in ${scope === "Current filtered view" ? "the current filtered view" : "the full region"}`
      : `${REGION} · ${rowCount} actioned project${rowCount === 1 ? "" : "s"} in ${scope === "Current filtered view" ? "the current filtered view" : "the full region"}`;

  function runExport() {
    if (format === "PDF summary") {
      onClose();
      // Real print flow: the browser's own print dialog, using the
      // @media print rules to hide chrome and print the current screen.
      window.print();
      return;
    }

    setExporting(true);
    try {
      const rows = scope === "Current filtered view" ? source.current : source.full;
      const csv =
        source.kind === "hotspots"
          ? hotspotsToCsv(rows as HotspotRow[])
          : impactActionsToCsv(rows as ImpactActionRow[]);
      const filename = `${REGION.toLowerCase()}-${source.kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, csv);
      onToast(`CSV downloaded — ${rowCount} row${rowCount === 1 ? "" : "s"}`);
      onClose();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }} data-no-print="true">
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: colors.scrimModal }} />
      <div
        style={{
          position: "relative",
          width: 420,
          maxWidth: "92vw",
          background: colors.surface,
          borderRadius: 7,
          border: `1px solid ${colors.borderStrong}`,
          boxShadow: colors.modalShadow,
          padding: "18px 20px 20px",
          fontFamily: fonts.sans
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600 }}>Export report</div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{scopeNote}</div>

        <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: colors.textFaint, margin: "16px 0 7px" }}>
          Format
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["CSV raw rows", "PDF summary"] as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 3,
                alignItems: "flex-start",
                textAlign: "left",
                border: `1px solid ${format === f ? colors.accent : colors.borderStrong}`,
                background: format === f ? colors.accentSoft : colors.surface,
                borderRadius: 5,
                padding: "10px 11px",
                fontFamily: "inherit",
                cursor: "pointer"
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{f}</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                {f === "CSV raw rows"
                  ? "one row per record, real currently-loaded data"
                  : "opens the browser print dialog (real print view, not a generated PDF file)"}
              </span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: colors.textFaint, margin: "16px 0 7px" }}>
          Scope
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["Current filtered view", "Full region"] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              style={{
                border: `1px solid ${scope === s ? colors.accent : colors.borderStrong}`,
                background: scope === s ? colors.accentSoft : colors.surface,
                color: scope === s ? colors.accentSoftText : "#4a4d52",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 12,
                fontFamily: "inherit",
                cursor: "pointer"
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: `1px solid ${colors.borderStrong}`,
              background: colors.surface,
              borderRadius: 4,
              padding: "8px 13px",
              fontSize: 12.5,
              fontFamily: "inherit",
              cursor: "pointer",
              color: colors.ink
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={runExport}
            disabled={exporting || rowCount === 0}
            style={{
              marginLeft: "auto",
              border: `1px solid ${colors.accent}`,
              background: colors.accent,
              color: "#fff",
              borderRadius: 4,
              padding: "8px 15px",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: exporting || rowCount === 0 ? "default" : "pointer",
              opacity: rowCount === 0 ? 0.6 : 1
            }}
          >
            {exporting ? "Preparing…" : format === "PDF summary" ? "Open print dialog" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
