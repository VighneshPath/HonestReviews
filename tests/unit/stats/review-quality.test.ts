import { describe, it, expect } from 'vitest';
import { scoreReview, qualityLabel, qualityColor } from '../../../src/stats/review-quality.js';
import type { ParsedReview } from '../../../src/parsers/amazon/review-list.js';

function makeReview(overrides: Partial<ParsedReview> = {}): ParsedReview {
  return {
    id: 'r1',
    element: document.createElement('div'),
    rating: 5,
    title: 'Good',
    body: 'test',
    isVerified: false,
    date: null,
    dateText: '',
    helpfulVotes: 0,
    hasImages: false,
    images: [],
    reviewerName: 'Test',
    bodyLength: 4,
    ...overrides,
  };
}

const NOW = new Date('2025-01-15');

describe('scoreReview', () => {
  it('gives a perfect-ish score for an ideal review', () => {
    const review = makeReview({
      bodyLength: 700,
      helpfulVotes: 25,
      isVerified: true,
      hasImages: true,
      date: new Date('2025-01-01'), // very recent
      rating: 3, // nuanced rating bonus
    });
    const result = scoreReview(review, NOW);
    // All categories maxed: 30 + 25 + 15 + 10 + 10 + 10 = 100
    expect(result.total).toBe(100);
    expect(result.breakdown.nuancedRating).toBe(10);
  });

  it('gives 0 for a minimal review', () => {
    const result = scoreReview(makeReview(), NOW);
    expect(result.total).toBe(0);
  });

  it('awards nuanced bonus only for 2-3 star ratings', () => {
    expect(scoreReview(makeReview({ rating: 2 }), NOW).breakdown.nuancedRating).toBe(10);
    expect(scoreReview(makeReview({ rating: 3 }), NOW).breakdown.nuancedRating).toBe(10);
    expect(scoreReview(makeReview({ rating: 1 }), NOW).breakdown.nuancedRating).toBe(0);
    expect(scoreReview(makeReview({ rating: 4 }), NOW).breakdown.nuancedRating).toBe(0);
    expect(scoreReview(makeReview({ rating: 5 }), NOW).breakdown.nuancedRating).toBe(0);
  });

  it('gives full recency for reviews within 90 days', () => {
    const recent = makeReview({ date: new Date('2025-01-01') }); // 14 days ago
    expect(scoreReview(recent, NOW).breakdown.recency).toBe(10);
  });

  it('gives 0 recency for reviews older than 2 years', () => {
    const old = makeReview({ date: new Date('2022-01-01') });
    expect(scoreReview(old, NOW).breakdown.recency).toBe(0);
  });

  it('scales length score proportionally', () => {
    const short = makeReview({ bodyLength: 300 }); // half of 600
    const score = scoreReview(short, NOW).breakdown.length;
    expect(score).toBe(15); // 30 * 0.5
  });

  it('caps total at 100', () => {
    const perfect = makeReview({
      bodyLength: 1000,
      helpfulVotes: 100,
      isVerified: true,
      hasImages: true,
      date: NOW,
      rating: 2,
    });
    expect(scoreReview(perfect, NOW).total).toBe(100);
  });
});

describe('qualityLabel', () => {
  it('returns High Quality for scores >= 75', () => {
    expect(qualityLabel(75)).toBe('High Quality');
    expect(qualityLabel(100)).toBe('High Quality');
  });

  it('returns Good for 50-74', () => {
    expect(qualityLabel(50)).toBe('Good');
    expect(qualityLabel(74)).toBe('Good');
  });

  it('returns Moderate for 25-49', () => {
    expect(qualityLabel(25)).toBe('Moderate');
    expect(qualityLabel(49)).toBe('Moderate');
  });

  it('returns Low Signal for < 25', () => {
    expect(qualityLabel(0)).toBe('Low Signal');
    expect(qualityLabel(24)).toBe('Low Signal');
  });
});
