"use client";

import { colors, fonts } from "@/lib/theme";
import { NATION, NATION_CODE, REGION, REGION_DISTRICT_COUNT } from "@/lib/region";
import type { AlertItem } from "@/lib/dashboardMetrics";
import { ROLES, type Role } from "./types";

interface Props {
  role: Role;
  onRoleChange: (role: Role) => void;
  lastScoredAt: string | null;
  alertsOpen: boolean;
  onToggleAlerts: () => void;
  alerts: AlertItem[];
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "no scores computed yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

export default function Header({
  role,
  onRoleChange,
  lastScoredAt,
  alertsOpen,
  onToggleAlerts,
  alerts
}: Props) {
  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 22px",
          height: 52,
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          position: "sticky",
          top: 0,
          zIndex: 30,
          fontFamily: fonts.sans
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: 4,
              padding: "5px 10px",
              fontSize: 12.5,
              fontWeight: 500,
              background: colors.panelSoft
            }}
            title="Nation (fixed for this demo)"
          >
            <span style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.textMuted, letterSpacing: ".06em" }}>
              {NATION_CODE}
            </span>
            <span>{NATION}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: 4,
              padding: "5px 10px",
              fontSize: 12.5,
              fontWeight: 500,
              background: colors.panelSoft
            }}
            title={`Region for the current data set (see lib/region.ts, sourced from scripts/ingest/config.ts - not a design-file literal)`}
          >
            <span>{REGION}</span>
            <span style={{ fontSize: 10.5, color: colors.textMuted }}>
              {REGION_DISTRICT_COUNT} districts
            </span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{ fontSize: 11.5, color: colors.textMuted, fontFamily: fonts.mono }}
            title="Most recent hotspot_scores.computed_at across the current baseline wave - the closest real signal to the design's 'Last ingest' timestamp this schema stores."
          >
            Last scored {formatTimestamp(lastScoredAt)}
          </div>
          <div style={{ width: 1, height: 20, background: colors.border }} />
          <button
            type="button"
            onClick={onToggleAlerts}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${colors.borderStrong}`,
              background: colors.surface,
              borderRadius: 4,
              padding: "5px 10px",
              fontSize: 12,
              fontFamily: "inherit",
              color: colors.ink,
              cursor: "pointer"
            }}
          >
            <span>Alerts</span>
            {alerts.length > 0 && (
              <span
                style={{
                  background: colors.danger,
                  color: "#fff",
                  borderRadius: 8,
                  padding: "1px 6px",
                  fontSize: 10.5,
                  fontWeight: 600,
                  fontFamily: fonts.mono
                }}
              >
                {alerts.length}
              </span>
            )}
          </button>
          <label
            style={{
              border: `1px solid ${colors.borderStrong}`,
              background: colors.surface,
              borderRadius: 4,
              padding: "5px 9px",
              fontSize: 12,
              color: colors.ink,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
            title="Client-side-only role selector: visually gates the Admin nav section, not real auth/RBAC (see status report)."
          >
            <span style={{ color: colors.textMuted, fontSize: 10.5 }}>Role</span>
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value as Role)}
              style={{ border: 0, background: "transparent", fontFamily: "inherit", fontSize: 12 }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div
            style={{
              border: `1px solid ${colors.borderStrong}`,
              background: colors.surface,
              borderRadius: 4,
              padding: "5px 9px",
              fontSize: 12,
              color: colors.ink
            }}
            title="Language indicator placeholder - the intake pipeline detects language_detected per submission, but there is no real UI-locale switcher built yet."
          >
            EN &#9662;
          </div>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: colors.accentSoft,
              color: colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600
            }}
          >
            {role.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {alertsOpen && (
        <div
          style={{
            position: "fixed",
            top: 54,
            right: 22,
            width: 360,
            background: colors.surface,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: 6,
            boxShadow: colors.popoverShadow,
            zIndex: 40,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${colors.borderFaint}`,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center"
            }}
          >
            <span>Notifications</span>
            <button
              type="button"
              onClick={onToggleAlerts}
              style={{
                marginLeft: "auto",
                border: 0,
                background: "none",
                fontFamily: "inherit",
                fontSize: 12,
                color: colors.textMuted,
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
          {alerts.length === 0 ? (
            <div style={{ padding: "14px", fontSize: 12.5, color: colors.textFaint }}>
              No unaddressed high-severity hotspots right now.
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "11px 14px",
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                  display: "flex",
                  gap: 10
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: colors.danger,
                    marginTop: 5,
                    flex: "none"
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.text}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: colors.textMuted,
                      marginTop: 3,
                      fontFamily: fonts.mono
                    }}
                  >
                    {formatTimestamp(a.when)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
