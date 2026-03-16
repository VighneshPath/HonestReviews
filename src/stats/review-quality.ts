import type { ParsedReview } from '../parsers/amazon/review-list.js';

export type ReviewSignal = 'length' | 'helpfulVotes' | 'verified' | 'hasImages' | 'recency' | 'nuancedRating';

export const ALL_SIGNALS = new Set<ReviewSignal>([
  'length', 'helpfulVotes', 'verified', 'hasImages', 'recency', 'nuancedRating',
]);

export interface QualityScore {
  total: number;
  breakdown: {
    length: number;
    helpfulVotes: number;
    verified: number;
    hasImages: number;
    recency: number;
    /** Bonus for 2-3 star reviews (most nuanced) */
    nuancedRating: number;
  };
}

const WEIGHTS: Record<ReviewSignal, number> = {
  /** Max 30 points for length */
  length: 30,
  /** Max 25 points for helpful votes */
  helpfulVotes: 25,
  /** 15 points for verified purchase */
  verified: 15,
  /** 10 points for having images */
  hasImages: 10,
  /** Max 10 points for recency (within last 12 months = full) */
  recency: 10,
  /** 10 bonus points for 2-3 star rating (most balanced perspective) */
  nuancedRating: 10,
};

/**
 * Score a review 0–100 based on signals of usefulness.
 *
 * @param availableSignals - Signals present on this site. Scores are normalised
 *   to 100 based on the max achievable with those signals, so reviews from sites
 *   that lack certain signals (e.g. no image uploads) are compared fairly.
 */
export function scoreReview(
  review: ParsedReview,
  now = new Date(),
  availableSignals: ReadonlySet<ReviewSignal> = ALL_SIGNALS,
): QualityScore {
  const raw = {
    length:        availableSignals.has('length')        ? scoreLengthPoints(review.bodyLength)      : 0,
    helpfulVotes:  availableSignals.has('helpfulVotes')  ? scoreHelpfulPoints(review.helpfulVotes)   : 0,
    verified:      availableSignals.has('verified')      ? (review.isVerified ? WEIGHTS.verified : 0): 0,
    hasImages:     availableSignals.has('hasImages')     ? (review.hasImages  ? WEIGHTS.hasImages  : 0): 0,
    recency:       availableSignals.has('recency')       ? scoreRecencyPoints(review.date, now)      : 0,
    nuancedRating: availableSignals.has('nuancedRating') ? scoreNuancedRatingPoints(review.rating)  : 0,
  };

  const rawTotal    = Object.values(raw).reduce((a, b) => a + b, 0);
  const maxPossible = [...availableSignals].reduce((sum, s) => sum + WEIGHTS[s], 0);

  const total = maxPossible > 0 ? Math.min(100, Math.round((rawTotal / maxPossible) * 100)) : 0;

  return { total, breakdown: raw };
}

function scoreLengthPoints(chars: number): number {
  if (chars <= 0) return 0;
  if (chars >= 600) return WEIGHTS.length;
  return Math.round((chars / 600) * WEIGHTS.length);
}

function scoreHelpfulPoints(votes: number): number {
  if (votes <= 0) return 0;
  if (votes >= 20) return WEIGHTS.helpfulVotes;
  return Math.round((votes / 20) * WEIGHTS.helpfulVotes);
}

function scoreRecencyPoints(date: Date | null, now: Date): number {
  if (!date) return 0;
  const ageDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 90)  return WEIGHTS.recency;
  if (ageDays <= 365) return Math.round(WEIGHTS.recency * 0.7);
  if (ageDays <= 730) return Math.round(WEIGHTS.recency * 0.4);
  return 0;
}

function scoreNuancedRatingPoints(rating: number | null): number {
  return (rating === 2 || rating === 3) ? WEIGHTS.nuancedRating : 0;
}

/** Quality tier label based on score */
export function qualityLabel(score: number): string {
  if (score >= 75) return 'High Quality';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Moderate';
  return 'Low Signal';
}

/** Returns a CSS modifier class for the quality tier */
export function qualityTier(score: number): 'high' | 'mid' | 'low' | 'minimal' {
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  if (score >= 25) return 'low';
  return 'minimal';
}
