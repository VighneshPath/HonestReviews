import type { ParsedReview } from '../parsers/amazon/review-list.js';
import type { StarDistribution } from '../parsers/amazon/product-page.js';

export interface AdjustedRatingResult {
  /** Weighted average of verified-purchase reviews only */
  verifiedRating: number | null;
  /** Count of verified reviews with a rating */
  verifiedCount: number;
  /** Total reviews analyzed (including unverified) */
  totalCount: number;
  /** Delta vs the official rating (positive = higher, negative = lower) */
  delta: number | null;
}

/**
 * Calculate a rating using only verified-purchase reviews, weighted by the
 * actual star distribution from Amazon's histogram.
 *
 * Naive averaging of our stratified sample (10 reviews per tier) always drifts
 * toward 3.0.  Instead we:
 *   1. Compute the verified rate per tier from our sample
 *      (e.g. 8/10 five-star reviews are verified → 80%)
 *   2. Weight those rates by the real histogram percentages
 *      (e.g. 65% of all reviews are five-star)
 *   3. Produce a rating that reflects both the true distribution and the
 *      verified-purchase signal from each tier
 *
 * Falls back to a plain average when no histogram data is available.
 */
export function calculateAdjustedRating(
  reviews: ParsedReview[],
  officialRating: number | null,
  starDistribution: StarDistribution[] = [],
): AdjustedRatingResult {
  const verifiedWithRating = reviews.filter((r) => r.isVerified && r.rating !== null);

  if (verifiedWithRating.length === 0) {
    return { verifiedRating: null, verifiedCount: 0, totalCount: reviews.length, delta: null };
  }

  let verifiedRating: number;

  if (starDistribution.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const { stars, percentage } of starDistribution) {
      if (percentage === 0) continue;
      const tierReviews = reviews.filter((r) => r.rating === stars);
      if (tierReviews.length === 0) continue;

      const verifiedRate = tierReviews.filter((r) => r.isVerified).length / tierReviews.length;
      const weight = percentage * verifiedRate;
      weightedSum += stars * weight;
      totalWeight += weight;
    }

    // totalWeight === 0 means every sampled tier had 0% verified — fall back to plain average
    verifiedRating = totalWeight > 0
      ? weightedSum / totalWeight
      : plainAverage(verifiedWithRating);
  } else {
    // No histogram yet (fetch hasn't completed) — use a plain average as a placeholder
    verifiedRating = plainAverage(verifiedWithRating);
  }

  verifiedRating = Math.round(verifiedRating * 10) / 10;
  const delta =
    officialRating !== null ? Math.round((verifiedRating - officialRating) * 10) / 10 : null;

  return {
    verifiedRating,
    verifiedCount: verifiedWithRating.length,
    totalCount: reviews.length,
    delta,
  };
}

function plainAverage(reviews: ParsedReview[]): number {
  return reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length;
}

/**
 * Format delta for display, e.g. "+0.3" or "-0.7" or "±0".
 */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '';
  if (delta === 0) return '±0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}
