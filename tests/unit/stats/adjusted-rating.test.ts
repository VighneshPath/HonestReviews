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
