import type { ParsedReview } from '../parsers/amazon/review-list.js';

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

const WEIGHTS = {
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
} as const;

/**
 * Score a review 0-100 based on signals of usefulness.
 * Higher = more worth reading.
 */
export function scoreReview(review: ParsedReview, now = new Date()): QualityScore {
  const length = scoreLengthPoints(review.bodyLength);
  const helpfulVotes = scoreHelpfulPoints(review.helpfulVotes);
  const verified = review.isVerified ? WEIGHTS.verified : 0;
  const hasImages = review.hasImages ? WEIGHTS.hasImages : 0;
  const recency = scoreRecencyPoints(review.date, now);
  const nuancedRating = scoreNuancedRatingPoints(review.rating);

  const total = Math.min(
    100,
    length + helpfulVotes + verified + hasImages + recency + nuancedRating,
  );

  return {
    total,
    breakdown: { length, helpfulVotes, verified, hasImages, recency, nuancedRating },
  };
}

function scoreLengthPoints(chars: number): number {
  // 0 chars = 0, 100 chars = ~10, 300 chars = ~20, 600+ chars = 30
  if (chars <= 0) return 0;
  if (chars >= 600) return WEIGHTS.length;
  return Math.round((chars / 600) * WEIGHTS.length);
}

function scoreHelpfulPoints(votes: number): number {
  // 0 = 0, 5 = ~13, 20+ = 25
  if (votes <= 0) return 0;
  if (votes >= 20) return WEIGHTS.helpfulVotes;
  return Math.round((votes / 20) * WEIGHTS.helpfulVotes);
}

function scoreRecencyPoints(date: Date | null, now: Date): number {
  if (!date) return 0;
  const ageMs = now.getTime() - date.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 90) return WEIGHTS.recency; // Within 3 months — full score
  if (ageDays <= 365) return Math.round(WEIGHTS.recency * 0.7); // Within 1 year — 7 points
  if (ageDays <= 730) return Math.round(WEIGHTS.recency * 0.4); // Within 2 years — 4 points
  return 0; // Older — no recency bonus
}

function scoreNuancedRatingPoints(rating: number | null): number {
  if (rating === null) return 0;
  // 2-3 star reviews tend to be most balanced/nuanced
  if (rating === 2 || rating === 3) return WEIGHTS.nuancedRating;
  return 0;
}

/** Quality tier label based on score */
export function qualityLabel(score: number): string {
  if (score >= 75) return 'High Quality';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Moderate';
  return 'Low Signal';
}

/** Quality tier color for UI */
export function qualityColor(score: number): string {
  if (score >= 75) return '#22c55e'; // green
  if (score >= 50) return '#3b82f6'; // blue
  if (score >= 25) return '#f59e0b'; // amber
  return '#9ca3af'; // gray
}
