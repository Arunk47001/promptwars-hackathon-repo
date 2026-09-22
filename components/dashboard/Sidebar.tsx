"use client";

import { colors, fonts } from "@/lib/theme";
import type { Role, Screen } from "./types";

const NAV_ITEMS: Array<{ id: Screen; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "hotspots", label: "Hotspot explorer" },
  { id: "impact", label: "Impact tracking" },
  { id: "data", label: "Data & provenance" }
];

const ADMIN_ITEMS: Array<{ label: string; tag: string }> = [
  { label: "Nations & localization", tag: "Wizard" },
  { label: "Users & roles", tag: "CRUD" },
  { label: "Privacy audit", tag: "Restricted" }
];

interface Props {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  role: Role;
}

/**
 * Collapsible* dark sidebar shell (C2). (*"Collapsible" here means the nav
 * sections themselves are the whole sidebar's content - there is no
 * secondary flyout state in the design to collapse into; the sidebar's
 * width is fixed per the design, matching its `220px` column.)
 */
export default function Sidebar({ screen, onNavigate, role }: Props) {
  const adminEnabled = role === "Administrator";

  return (
    <aside
      style={{
        background: colors.sidebarBg,
        color: colors.sidebarText,
        display: "flex",
        flexDirection: "column",
        padding: "0 0 16px",
        position: "sticky",
        top: 0,
        height: "100vh",
        fontFamily: fonts.sans
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 22px" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 3,
            background: colors.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".04em"
          }}
        >
          CI
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
            Citizen Infrastructure
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: colors.sidebarHeading,
              letterSpacing: ".06em",
              textTransform: "uppercase"
            }}
          >
            BRICS Platform
          </div>
        </div>
      </div>

      <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: colors.sidebarMuted,
            padding: "6px 8px 8px"
          }}
        >
          Analysis
        </div>
        {NAV_ITEMS.map((item) => {
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                textAlign: "left",
                border: 0,
                borderRadius: 4,
                padding: "8px 9px",
                fontFamily: "inherit",
                fontSize: 12.5,
                cursor: "pointer",
                background: active ? colors.sidebarActiveBg : "transparent",
                color: active ? "#ffffff" : colors.sidebarText
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "currentColor",
                  opacity: 0.55,
                  flex: "none"
                }}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: "0 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          marginTop: 14
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: colors.sidebarMuted,
            padding: "6px 8px 8px"
          }}
        >
          Administration
        </div>
        {ADMIN_ITEMS.map((item) => (
          <div
            key={item.label}
            title={
              adminEnabled
                ? undefined
                : "Visible per the design's role-gated nav, but disabled: switch the role selector (top right) to Administrator to preview. No real screen/auth backs this yet - see status report."
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 9px",
              fontSize: 12.5,
              color: colors.sidebarMutedAlt,
              borderRadius: 4,
              opacity: adminEnabled ? 1 : 0.45
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "currentColor",
                opacity: 0.4,
                flex: "none"
              }}
            />
            <span>{item.label}</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 9.5,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#5d646b"
              }}
            >
              {item.tag}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "14px 18px 0",
          borderTop: `1px solid ${colors.sidebarBorder}`,
          marginLeft: 10,
          marginRight: 10
        }}
      >
        <div style={{ fontSize: 11, color: colors.sidebarHeading, lineHeight: 1.5 }}>
          Signed in as
          <br />
          <span style={{ color: colors.sidebarLabel }}>Dashboard user</span>
        </div>
        <div style={{ fontSize: 10.5, color: colors.sidebarMuted, marginTop: 4 }}>
          {role} · {"India"}
        </div>
      </div>
    </aside>
  );
}
