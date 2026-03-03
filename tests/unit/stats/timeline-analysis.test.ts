import { describe, it, expect } from 'vitest';
import { analyzeTimeline } from '../../../src/stats/timeline-analysis.js';
import type { ParsedReview } from '../../../src/parsers/amazon/review-list.js';

function makeReview(date: Date | null, id = 'r'): ParsedReview {
  return {
    id,
    element: document.createElement('div'),
    rating: 5,
    title: '',
    body: '',
    isVerified: true,
    date,
    dateText: '',
    helpfulVotes: 0,
    hasImages: false,
    reviewerName: '',
    bodyLength: 0,
  };
}

describe('analyzeTimeline', () => {
  it('returns no burst for fewer than 3 dated reviews', () => {
    const reviews = [
      makeReview(new Date('2024-01-01'), 'r1'),
      makeReview(new Date('2024-01-02'), 'r2'),
    ];
    const result = analyzeTimeline(reviews);
    expect(result.hasBurst).toBe(false);
    expect(result.burstDescription).toBeNull();
  });

  it('detects burst when 40%+ reviews in same month', () => {
    const reviews = [
      makeReview(new Date('2024-06-01'), 'r1'),
      makeReview(new Date('2024-06-05'), 'r2'),
      makeReview(new Date('2024-06-10'), 'r3'),
      makeReview(new Date('2024-06-15'), 'r4'),
      makeReview(new Date('2024-07-01'), 'r5'),
      makeReview(new Date('2024-08-01'), 'r6'),
    ];
    // 4 out of 6 (66%) in June — should detect burst
    const result = analyzeTimeline(reviews);
    expect(result.hasBurst).toBe(true);
    expect(result.burstDescription).toContain('June');
    expect(result.burstDescription).toContain('4 of 6');
  });

  it('does not flag burst when distribution is spread', () => {
    const reviews = Array.from({ length: 6 }, (_, i) =>
      makeReview(new Date(2024, i, 1), `r${i}`),
    );
    const result = analyzeTimeline(reviews);
    expect(result.hasBurst).toBe(false);
  });

  it('ignores reviews with null dates', () => {
    const reviews = [
      makeReview(null, 'r1'),
      makeReview(new Date('2024-06-01'), 'r2'),
      makeReview(new Date('2024-06-02'), 'r3'),
      makeReview(new Date('2024-06-03'), 'r4'),
    ];
    // 3 dated reviews all in June — 100% in one month, should trigger
    const result = analyzeTimeline(reviews);
    expect(result.hasBurst).toBe(true);
  });

  it('builds byMonth correctly', () => {
    const reviews = [
      makeReview(new Date('2024-03-15'), 'r1'),
      makeReview(new Date('2024-03-20'), 'r2'),
      makeReview(new Date('2024-04-01'), 'r3'),
    ];
    const result = analyzeTimeline(reviews);
    expect(result.byMonth['2024-03']).toBe(2);
    expect(result.byMonth['2024-04']).toBe(1);
  });
});
