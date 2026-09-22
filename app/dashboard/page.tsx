import DashboardApp from "@/components/dashboard/DashboardApp";

/**
 * Policymaker dashboard route (C2 of
 * .squad/task/redesign-dashboard-per-design-canvas.md). All of the actual
 * shell/screen/state logic lives in `components/dashboard/DashboardApp.tsx`
 * (a client component) - this route file just mounts it, matching the
 * design's single-page sidebar+header shell with client-side screen
 * switching.
 */
export default function DashboardPage() {
  return <DashboardApp />;
}
