import type { ParsedReview } from '../parsers/amazon/review-list.js';

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
 * Calculate a rating using only verified-purchase reviews.
 * Compares against the official Amazon rating to surface discrepancies.
 */
export function calculateAdjustedRating(
  reviews: ParsedReview[],
  officialRating: number | null,
): AdjustedRatingResult {
  const verified = reviews.filter((r) => r.isVerified && r.rating !== null);

  if (verified.length === 0) {
    return {
      verifiedRating: null,
      verifiedCount: 0,
      totalCount: reviews.length,
      delta: null,
    };
  }

  const sum = verified.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  const verifiedRating = Math.round((sum / verified.length) * 10) / 10;

  const delta =
    officialRating !== null
      ? Math.round((verifiedRating - officialRating) * 10) / 10
      : null;

  return {
    verifiedRating,
    verifiedCount: verified.length,
    totalCount: reviews.length,
    delta,
  };
}

/**
 * Format delta for display, e.g. "+0.3" or "-0.7" or "±0".
 */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '';
  if (delta === 0) return '±0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}
