import { describe, it, expect } from 'vitest';
import { calculateAdjustedRating, formatDelta } from '../../../src/stats/adjusted-rating.js';
import type { ParsedReview } from '../../../src/parsers/amazon/review-list.js';

function makeReview(overrides: Partial<ParsedReview>): ParsedReview {
  return {
    id: 'r1',
    element: document.createElement('div'),
    rating: 5,
    title: 'Great',
    body: 'Good product',
    isVerified: true,
    date: new Date('2024-12-01'),
    dateText: 'Reviewed on December 1, 2024',
    helpfulVotes: 0,
    hasImages: false,
    images: [],
    reviewerName: 'Tester',
    bodyLength: 12,
    ...overrides,
  };
}

describe('calculateAdjustedRating', () => {
  it('returns null verifiedRating when no verified reviews', () => {
    const reviews = [
      makeReview({ isVerified: false, rating: 5 }),
      makeReview({ isVerified: false, rating: 4 }),
    ];
    const result = calculateAdjustedRating(reviews, 4.5);
    expect(result.verifiedRating).toBeNull();
    expect(result.verifiedCount).toBe(0);
    expect(result.delta).toBeNull();
  });

  it('calculates average of verified reviews only', () => {
    const reviews = [
      makeReview({ isVerified: true, rating: 5 }),
      makeReview({ isVerified: true, rating: 3 }),
      makeReview({ isVerified: false, rating: 1 }), // should be excluded
    ];
    const result = calculateAdjustedRating(reviews, 4.5);
    expect(result.verifiedRating).toBe(4.0);
    expect(result.verifiedCount).toBe(2);
  });

  it('calculates delta vs official rating', () => {
    const reviews = [
      makeReview({ isVerified: true, rating: 3 }),
      makeReview({ isVerified: true, rating: 3 }),
    ];
    const result = calculateAdjustedRating(reviews, 4.5);
    expect(result.verifiedRating).toBe(3.0);
    expect(result.delta).toBe(-1.5);
  });

  it('handles null official rating', () => {
    const reviews = [makeReview({ isVerified: true, rating: 4 })];
    const result = calculateAdjustedRating(reviews, null);
    expect(result.delta).toBeNull();
    expect(result.verifiedRating).toBe(4.0);
  });

  it('rounds to one decimal place', () => {
    const reviews = [
      makeReview({ isVerified: true, rating: 5 }),
      makeReview({ isVerified: true, rating: 4 }),
      makeReview({ isVerified: true, rating: 3 }),
    ];
    const result = calculateAdjustedRating(reviews, 4.0);
    expect(result.verifiedRating).toBe(4.0);
  });

  it('skips verified reviews with null rating', () => {
    const reviews = [
      makeReview({ isVerified: true, rating: null }),
      makeReview({ isVerified: true, rating: 4 }),
    ];
    const result = calculateAdjustedRating(reviews, 4.0);
    expect(result.verifiedCount).toBe(1); // null rating excluded
    expect(result.verifiedRating).toBe(4.0);
  });
});

describe('calculateAdjustedRating — histogram-weighted', () => {
  // Simulate a stratified fetch: 10 reviews per tier, all verified.
  // Without weighting the naive average would be exactly 3.0.
  // With the histogram (65% five-star, 20% four-star, 5% three-star,
  // 1% two-star, 9% one-star) the result should be close to
  // what a proportional sample would produce.
  const distribution = [
    { stars: 5, percentage: 65 },
    { stars: 4, percentage: 20 },
    { stars: 3, percentage: 5 },
    { stars: 2, percentage: 1 },
    { stars: 1, percentage: 9 },
  ];

  function makeTier(rating: number, count: number, verifiedCount: number): ParsedReview[] {
    return Array.from({ length: count }, (_, i) =>
      makeReview({ id: `r-${rating}-${i}`, rating, isVerified: i < verifiedCount }),
    );
  }

  it('weights by histogram so result is not biased toward 3', () => {
    // 10 reviews per tier, all verified
    const reviews = [
      ...makeTier(5, 10, 10),
      ...makeTier(4, 10, 10),
      ...makeTier(3, 10, 10),
      ...makeTier(2, 10, 10),
      ...makeTier(1, 10, 10),
    ];
    const result = calculateAdjustedRating(reviews, 4.3, distribution);
    // Weighted: (5×65 + 4×20 + 3×5 + 2×1 + 1×9) / (65+20+5+1+9) = 428/100 = 4.3
    expect(result.verifiedRating).toBe(4.3);
    expect(result.verifiedRating).not.toBe(3.0);
  });

  it('reflects low verified rate in high-star tiers', () => {
    // 5-star tier: only 2/10 verified; all other tiers: 10/10 verified
    const reviews = [
      ...makeTier(5, 10, 2),   // 20% verified
      ...makeTier(4, 10, 10),
      ...makeTier(3, 10, 10),
      ...makeTier(2, 10, 10),
      ...makeTier(1, 10, 10),
    ];
    const result = calculateAdjustedRating(reviews, 4.3, distribution);
    // Low verified rate at 5-star pulls the weighted rating down
    expect(result.verifiedRating).toBeLessThan(4.3);
  });

  it('falls back to plain average when no histogram supplied', () => {
    const reviews = [
      makeReview({ rating: 5, isVerified: true }),
      makeReview({ rating: 1, isVerified: true }),
    ];
    const result = calculateAdjustedRating(reviews, 4.0);
    expect(result.verifiedRating).toBe(3.0);
  });

  it('skips tiers with no sampled reviews', () => {
    // No 1-star or 2-star reviews in sample
    const reviews = [
      ...makeTier(5, 10, 10),
      ...makeTier(4, 10, 10),
      ...makeTier(3, 10, 10),
    ];
    const result = calculateAdjustedRating(reviews, 4.3, distribution);
    // Only tiers 3-5 contribute; weights: 65+20+5 = 90
    // (5×65 + 4×20 + 3×5) / 90 = 430/90 ≈ 4.8
    expect(result.verifiedRating).toBeGreaterThan(4.0);
  });
});

describe('formatDelta', () => {
  it('returns empty string for null', () => {
    expect(formatDelta(null)).toBe('');
  });

  it('returns ±0 for zero', () => {
    expect(formatDelta(0)).toBe('±0');
  });

  it('formats positive delta with +', () => {
    expect(formatDelta(0.5)).toBe('+0.5');
  });

  it('formats negative delta with -', () => {
    expect(formatDelta(-1.2)).toBe('-1.2');
  });
});
