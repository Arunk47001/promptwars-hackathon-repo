/**
 * Text+color severity badge (see .squad/designer/…: "SeverityBadge —
 * Text+color badge — never color-only"). The composite score is a
 * z-score-based composite, so it can be negative; bucket it into
 * Low/Medium/High around 0 using a +/-1 threshold rather than encoding
 * severity as a raw number or color alone.
 */
export function severityLabel(score: number): "Low" | "Medium" | "High" {
  if (score >= 1) return "High";
  if (score <= -1) return "Low";
  return "Medium";
}

const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  High: { bg: "#fee2e2", fg: "#991b1b" },
  Medium: { bg: "#fef3c7", fg: "#92400e" },
  Low: { bg: "#dcfce7", fg: "#166534" }
};

export default function SeverityBadge({ score }: { score: number }) {
  const label = severityLabel(score);
  const { bg, fg } = SEVERITY_COLORS[label];
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
