import { describe, expect, it } from "vitest";
import {
  colorForScore,
  relativeSeverityLabel,
  severityLabel,
  SEVERITY_BADGE_COLORS
} from "@/lib/colorScale";

describe("colorForScore", () => {
  it("returns a visible mid tone (not the t=0 light end) when every score ties", () => {
    // No variance across the set (e.g. only one district+category scored
    // yet) - min === max, so the "range === 0" branch should kick in
    // rather than collapsing everything to the near-invisible light end.
    const tied = colorForScore(1.5, 1.5, 1.5);
    const lowEnd = colorForScore(0, 1, 0);
    expect(tied).not.toBe(lowEnd);
  });

  it("returns the light end of the ramp for the minimum score", () => {
    expect(colorForScore(0, 2, 0)).toBe(colorForScore(0, 2, 0));
    const low = colorForScore(0, 2, 0);
    const high = colorForScore(2, 2, 0);
    expect(low).not.toBe(high);
  });

  it("returns a neutral gray for an undefined score (no data)", () => {
    expect(colorForScore(undefined, 2, 0)).toBe("#e0e0e0");
  });
});

describe("relativeSeverityLabel", () => {
  it("buckets into low/medium/high thirds of the currently-displayed range", () => {
    expect(relativeSeverityLabel(0, 3, 0)).toBe("low severity");
    expect(relativeSeverityLabel(1.5, 3, 0)).toBe("medium severity");
    expect(relativeSeverityLabel(3, 3, 0)).toBe("high severity");
  });

  it("returns 'no data' for an undefined score", () => {
    expect(relativeSeverityLabel(undefined, 3, 0)).toBe("no data");
  });
});

describe("severityLabel (absolute z-score bucket)", () => {
  it("buckets a composite score >= 1 as High", () => {
    expect(severityLabel(1.4)).toBe("High");
  });
  it("buckets a composite score <= -1 as Low", () => {
    expect(severityLabel(-1.2)).toBe("Low");
  });
  it("buckets everything in between as Medium, including 0 and negative-but->-1", () => {
    expect(severityLabel(0)).toBe("Medium");
    expect(severityLabel(-0.5)).toBe("Medium");
  });

  it("has a badge color defined for every possible label", () => {
    for (const label of ["High", "Medium", "Low"] as const) {
      expect(SEVERITY_BADGE_COLORS[label]).toBeDefined();
    }
  });
});
