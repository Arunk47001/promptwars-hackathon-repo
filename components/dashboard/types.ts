/** Shared shell/screen types for the redesigned dashboard (C2). */

export type Screen = "overview" | "hotspots" | "impact" | "data";

/**
 * Client-side-only, non-authenticated role selector (per this breakdown's
 * "Critical constraint": admin nav items have no backing screens/auth in
 * the real app, so this only visually gates the Admin nav section the same
 * way the design's `role` prop does - it is NOT real auth/RBAC).
 */
export type Role = "Policymaker" | "Analyst" | "Administrator";

export const ROLES: Role[] = ["Policymaker", "Analyst", "Administrator"];
