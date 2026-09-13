import { describe, expect, it } from "vitest";
import {
  isRateLimited,
  trigramSimilarity,
  checkDuplicate,
  detectBurst,
  computeScoreWeight,
  DEFAULT_RATE_LIMIT,
  type RecentSubmission
} from "@/lib/spam";

describe("isRateLimited", () => {
  it("rejects once the configured max requests/hour is reached", () => {
    const now = Date.now();
    const priorTimestamps = Array.from({ length: DEFAULT_RATE_LIMIT.maxRequestsPerWindow }).map(
      (_, i) => now - i * 60 * 1000
    );
    expect(isRateLimited(priorTimestamps, now)).toBe(true);
  });

  it("allows requests under the limit", () => {
    const now = Date.now();
    expect(isRateLimited([now - 60000], now)).toBe(false);
  });

  it("ignores submissions outside the time window", () => {
    const now = Date.now();
    const oldTimestamps = Array.from({ length: 10 }).map(
      () => now - 2 * DEFAULT_RATE_LIMIT.windowMs
    );
    expect(isRateLimited(oldTimestamps, now)).toBe(false);
  });
});

describe("trigramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(trigramSimilarity("the road is flooded", "the road is flooded")).toBe(1);
  });

  it("returns a high score for near-identical strings", () => {
    const sim = trigramSimilarity(
      "the road near the market is flooded every monsoon",
      "the road near the market floods every monsoon"
    );
    expect(sim).toBeGreaterThan(0.6);
  });

  it("returns a low score for unrelated strings", () => {
    const sim = trigramSimilarity(
      "no electricity for three days in our village",
      "the school building roof collapsed after the storm"
    );
    expect(sim).toBeLessThan(0.3);
  });
});

describe("checkDuplicate", () => {
  const recent: RecentSubmission[] = [
    {
      id: "abc",
      description: "The hand pump near the school has been broken for two weeks",
      phoneHash: "hash-1",
      createdAtMs: Date.now() - 1000
    }
  ];

  it("flags a near-identical description as a likely duplicate (down-weighted, not dropped)", () => {
    const result = checkDuplicate(
      "The hand pump near the school has been broken for 2 weeks now",
      recent
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedId).toBe("abc");
  });

  it("does not flag a clearly different description", () => {
    const result = checkDuplicate("Electricity has been out for four days", recent);
    expect(result.isDuplicate).toBe(false);
  });

  it("handles a missing/empty recent list without crashing (edge case)", () => {
    const result = checkDuplicate("Anything at all", []);
    expect(result.isDuplicate).toBe(false);
  });
});

describe("detectBurst", () => {
  it("flags a burst of near-identical submissions from many distinct numbers", () => {
    const now = Date.now();
    const recent: RecentSubmission[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `sub-${i}`,
      description: "There is no water supply in our area since last week",
      phoneHash: `hash-${i}`,
      createdAtMs: now - i * 1000
    }));
    const result = detectBurst(
      "There is no water supply in our area since last week",
      recent,
      now
    );
    expect(result.isBurst).toBe(true);
    expect(result.distinctSubmitters).toBeGreaterThanOrEqual(4);
  });

  it("does not flag a handful of genuinely distinct submissions as a burst", () => {
    const now = Date.now();
    const recent: RecentSubmission[] = [
      { id: "1", description: "Road is damaged", phoneHash: "a", createdAtMs: now },
      { id: "2", description: "No electricity since Monday", phoneHash: "b", createdAtMs: now },
      { id: "3", description: "School roof is leaking", phoneHash: "c", createdAtMs: now }
    ];
    const result = detectBurst("Water quality is poor here", recent, now);
    expect(result.isBurst).toBe(false);
  });
});

describe("computeScoreWeight", () => {
  it("down-weights duplicates more than burst-flagged, and confirmed submissions get full weight", () => {
    const confirmed = computeScoreWeight({ isLikelyDuplicate: false, isBurstFlagged: false });
    const burst = computeScoreWeight({ isLikelyDuplicate: false, isBurstFlagged: true });
    const duplicate = computeScoreWeight({ isLikelyDuplicate: true, isBurstFlagged: false });

    expect(confirmed).toBe(1.0);
    expect(duplicate).toBeLessThan(burst);
    expect(burst).toBeLessThan(confirmed);
  });
});
