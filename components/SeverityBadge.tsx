import { severityLabel, SEVERITY_BADGE_COLORS } from "@/lib/colorScale";

export { severityLabel };

/**
 * Text+color severity badge (see .squad/designer/…: "SeverityBadge —
 * Text+color badge — never color-only"). The composite score is a
 * z-score-based composite, so it can be negative; bucket it into
 * Low/Medium/High around 0 using a +/-1 threshold rather than encoding
 * severity as a raw number or color alone. The bucketing/color logic now
 * lives in lib/colorScale.ts so the redesigned dashboard's other badges
 * (top-hotspots list, ranked table, hotspot drawer) share the same
 * definition instead of re-deriving it.
 */
export default function SeverityBadge({ score }: { score: number }) {
  const label = severityLabel(score);
  const { bg, fg } = SEVERITY_BADGE_COLORS[label];
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: fg,
        borderRadius: 4,
        padding: "1px 8px",
        fontSize: 12,
        fontWeight: 600,
        verticalAlign: "middle"
      }}
    >
      {label} severity
    </span>
  );
}
