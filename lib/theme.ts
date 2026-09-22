/**
 * Shared design tokens (C1 of .squad/task/redesign-dashboard-per-design-canvas.md).
 *
 * Extracted from the inline styles in
 * `design/BRICS Citizen Infrastructure Platform.dc.html` so every shell/
 * screen component built for this redesign references the same palette
 * instead of re-declaring hex values in each file. These are the design's
 * *visual system* tokens (colors/spacing/radii/typography) - never its mock
 * data numbers (district names, scores, counts), per this breakdown's
 * "Critical constraint" section.
 */

export const colors = {
  // Page/background
  bg: "#f6f5f2",
  surface: "#ffffff",

  // Borders
  border: "#e2e0da",
  borderStrong: "#ddd9d1",
  borderSubtle: "#f0ede7",
  borderFaint: "#ece9e3",

  // Text
  ink: "#1a1c1e",
  inkSoft: "#2a2d31",
  textMuted: "#6d7076",
  textFaint: "#8a8d92",
  textFainter: "#9b9ea3",

  // Accent (links, primary buttons, active states)
  accent: "#1e5aa8",
  accentHover: "#164374",
  accentSoft: "#eaf1f9",
  accentSoftText: "#164374",

  // Status / semantic
  danger: "#a62b1f",
  dangerSoft: "#fbeae8",
  dangerSoftText: "#8f231a",
  warnSoft: "#fbf2e2",
  warnSoftText: "#8a5600",
  successSoft: "#e9f2f0",
  successSoftText: "#0f5d56",
  tealText: "#0f766e",
  tealSoftBg: "#f7faf9",
  tealBorder: "#d7e4e1",
  neutralSoft: "#f2efe9",
  neutralSoftText: "#6d7076",
  panelSoft: "#fbfaf8",

  // Sidebar (dark shell)
  sidebarBg: "#1c2024",
  sidebarText: "#b9bec4",
  sidebarActiveBg: "#2e343a",
  sidebarHoverBg: "#262b30",
  sidebarMuted: "#6b7278",
  sidebarMutedAlt: "#767c82",
  sidebarBorder: "#2a2f34",
  sidebarHeading: "#7d848b",
  sidebarLabel: "#dfe3e7",

  // Score-composition bar segments
  compositionDemand: "#1e5aa8",
  compositionGap: "#6497bf",
  compositionOffset: "#cbb8a4",

  // Shadows (used as CSS box-shadow strings directly)
  cardShadowHover: "0 2px 8px rgba(20, 22, 24, .06)",
  drawerShadow: "-14px 0 40px rgba(20, 22, 24, .16)",
  scrimDrawer: "rgba(22, 24, 26, .28)",
  scrimModal: "rgba(22, 24, 26, .3)",
  modalShadow: "0 20px 50px rgba(20, 22, 24, .2)",
  toastShadow: "0 10px 24px rgba(20, 22, 24, .22)",
  popoverShadow: "0 12px 30px rgba(20, 22, 24, .14)"
} as const;

export const fonts = {
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace"
} as const;

/** Border radii, in px, matching the design's `border-radius` values. */
export const radii = {
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6,
  xxl: 7
} as const;

/** Spacing scale, in px, matching the design's common padding/gap values. */
export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 22
} as const;

/**
 * Sequential single-hue ramp (colorblind-safe: lightness-only within one
 * hue, never a diverging/rainbow interpolation) - matches the design's own
 * default "Single-hue blue" map-ramp option and the direction of the
 * existing `colorForScore` fix in `lib/colorScale.ts` (six discrete steps,
 * light -> dark). Kept here as the canonical token list; `lib/colorScale.ts`
 * re-exports it for the district grid / map.
 */
export const rampBlue = [
  "#f0f4f9",
  "#cddde9",
  "#9dbed6",
  "#6497bf",
  "#3a6f9e",
  "#1b4a78"
] as const;

export type ThemeColors = typeof colors;
