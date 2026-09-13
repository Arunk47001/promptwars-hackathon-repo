/**
 * Spam / duplicate detection module (C9). Heuristic-based only, per the
 * plan's confirmed scope (no ML).
 *
 *  1. Rate limiting per hashed phone number at the webhook layer.
 *  2. Fuzzy text-similarity vs. recent same-district+category submissions
 *     -> flagged/down-weighted, never silently dropped.
 *  3. Burst-pattern heuristic across distinct numbers -> flagged for human
 *     review, not auto-suppressed.
 */

export interface RateLimitConfig {
  maxRequestsPerWindow: number;
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequestsPerWindow: 5,
  windowMs: 60 * 60 * 1000 // 1 hour
};

/**
 * Given the timestamps (ms epoch) of a hashed phone number's prior
 * submissions and the config, decide whether a new submission right now
 * should be rejected for exceeding the rate limit.
 */
export function isRateLimited(
  priorTimestampsMs: number[],
  nowMs: number = Date.now(),
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): boolean {
  const windowStart = nowMs - config.windowMs;
  const inWindow = priorTimestampsMs.filter((t) => t >= windowStart && t <= nowMs);
  return inWindow.length >= config.maxRequestsPerWindow;
}

/**
 * Character-trigram Jaccard similarity - cheap, dependency-free fuzzy
 * text-similarity check. Returns a value in [0, 1]; 1 = identical trigram sets.
 */
export function trigramSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const trigrams = (s: string): Set<string> => {
    const norm = normalize(s);
    if (norm.length < 3) return new Set([norm]);
    const grams = new Set<string>();
    for (let i = 0; i <= norm.length - 3; i += 1) {
      grams.add(norm.slice(i, i + 3));
    }
    return grams;
  };

  const setA = trigrams(a);
  const setB = trigrams(b);
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const g of setA) {
    if (setB.has(g)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.6;

export interface RecentSubmission {
  id: string;
  description: string;
  phoneHash: string;
  createdAtMs: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedId?: string;
  similarity?: number;
}

/**
 * Checks a new submission's description against recent same-district+
 * category submissions (caller is responsible for pre-filtering the
 * `recent` list to same district+category within the time window).
 */
export function checkDuplicate(
  newDescription: string,
  recent: RecentSubmission[],
  threshold: number = DUPLICATE_SIMILARITY_THRESHOLD
): DuplicateCheckResult {
  let best: { id: string; similarity: number } | undefined;
  for (const candidate of recent) {
    const similarity = trigramSimilarity(newDescription, candidate.description);
    if (!best || similarity > best.similarity) {
      best = { id: candidate.id, similarity };
    }
  }
  if (best && best.similarity >= threshold) {
    return { isDuplicate: true, matchedId: best.id, similarity: best.similarity };
  }
  return { isDuplicate: false };
}

export interface BurstCheckConfig {
  minDistinctSubmitters: number;
  minSimilarityToCluster: number;
  windowMs: number;
}

export const DEFAULT_BURST_CONFIG: BurstCheckConfig = {
  minDistinctSubmitters: 4,
  minSimilarityToCluster: 0.5,
  windowMs: 30 * 60 * 1000 // 30 minutes
};

/**
 * Burst-pattern heuristic: given a candidate new submission and a recent
 * window of same-district+category submissions from *distinct* hashed
 * numbers, flags a possible astroturfing burst if enough of them are
 * textually similar to each other (not just to the new one).
 */
export function detectBurst(
  candidateDescription: string,
  recent: RecentSubmission[],
  nowMs: number = Date.now(),
  config: BurstCheckConfig = DEFAULT_BURST_CONFIG
): { isBurst: boolean; matchedCount: number; distinctSubmitters: number } {
  const windowStart = nowMs - config.windowMs;
  const inWindow = recent.filter((r) => r.createdAtMs >= windowStart);

  const similarOnes = inWindow.filter(
    (r) =>
      trigramSimilarity(candidateDescription, r.description) >=
      config.minSimilarityToCluster
  );

  const distinctSubmitters = new Set(similarOnes.map((r) => r.phoneHash)).size;
  const isBurst = distinctSubmitters >= config.minDistinctSubmitters;

  return { isBurst, matchedCount: similarOnes.length, distinctSubmitters };
}

/** Down-weighting applied to duplicate-flagged submissions in scoring (C10). */
export const DUPLICATE_SCORE_WEIGHT = 0.25;
export const BURST_FLAGGED_SCORE_WEIGHT = 0.5;
export const CONFIRMED_SCORE_WEIGHT = 1.0;

export function computeScoreWeight(flags: {
  isLikelyDuplicate: boolean;
  isBurstFlagged: boolean;
}): number {
  if (flags.isLikelyDuplicate) return DUPLICATE_SCORE_WEIGHT;
  if (flags.isBurstFlagged) return BURST_FLAGGED_SCORE_WEIGHT;
  return CONFIRMED_SCORE_WEIGHT;
}
