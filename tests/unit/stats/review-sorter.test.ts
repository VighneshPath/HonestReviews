import { describe, it, expect } from 'vitest';
import { sortReviews } from '../../../src/stats/review-sorter.js';
import type { ParsedReview } from '../../../src/parsers/amazon/review-list.js';

function makeReview(overrides: Partial<ParsedReview>): ParsedReview {
  return {
    id: 'r1',
    element: null,
    rating: 4,
    title: 'Test review',
    body: 'A'.repeat(200),
    isVerified: true,
    date: new Date('2024-06-01'),
    dateText: 'Reviewed in the United States on June 1, 2024',
    helpfulVotes: 5,
    hasImages: false,
    images: [],
    reviewerName: 'Tester',
    bodyLength: 200,
    ...overrides,
  };
}

describe('sortReviews', () => {
  it('most-helpful sorts by helpfulVotes descending', () => {
    const reviews = [
      makeReview({ id: 'a', helpfulVotes: 3 }),
      makeReview({ id: 'b', helpfulVotes: 20 }),
      makeReview({ id: 'c', helpfulVotes: 0 }),
    ];
    expect(sortReviews(reviews, 'most-helpful').map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('top-rated sorts by rating descending', () => {
    const reviews = [
      makeReview({ id: 'a', rating: 3 }),
      makeReview({ id: 'b', rating: 5 }),
      makeReview({ id: 'c', rating: 1 }),
    ];
    expect(sortReviews(reviews, 'top-rated').map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('critical sorts by rating ascending', () => {
    const reviews = [
      makeReview({ id: 'a', rating: 3 }),
      makeReview({ id: 'b', rating: 5 }),
      makeReview({ id: 'c', rating: 1 }),
    ];
    expect(sortReviews(reviews, 'critical').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('recent sorts by date descending', () => {
    const reviews = [
      makeReview({ id: 'a', date: new Date('2023-01-01') }),
      makeReview({ id: 'b', date: new Date('2024-06-01') }),
      makeReview({ id: 'c', date: new Date('2022-01-01') }),
    ];
    expect(sortReviews(reviews, 'recent').map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('most-informative scores verified > unverified with same content', () => {
    const verified = makeReview({ id: 'verified', isVerified: true, bodyLength: 500, helpfulVotes: 10 });
    const unverified = makeReview({ id: 'unverified', isVerified: false, bodyLength: 500, helpfulVotes: 10 });
    const sorted = sortReviews([unverified, verified], 'most-informative');
    expect(sorted[0]?.id).toBe('verified');
  });

  it('most-informative ranks 2-3 star reviews higher (nuanced bonus)', () => {
    const nuanced = makeReview({ id: 'nuanced', rating: 3, bodyLength: 400, isVerified: true });
    const fiveStar = makeReview({ id: 'fivestar', rating: 5, bodyLength: 400, isVerified: true });
    expect(sortReviews([fiveStar, nuanced], 'most-informative')[0]?.id).toBe('nuanced');
  });

  it('works with reviews that have element: null (fetched reviews)', () => {
    const reviews = [
      makeReview({ id: 'a', element: null, helpfulVotes: 5 }),
      makeReview({ id: 'b', element: null, helpfulVotes: 20 }),
    ];
    expect(() => sortReviews(reviews, 'most-helpful')).not.toThrow();
    expect(sortReviews(reviews, 'most-helpful')[0]?.id).toBe('b');
  });

  it('does not mutate the input array', () => {
    const reviews = [
      makeReview({ id: 'a', rating: 3 }),
      makeReview({ id: 'b', rating: 5 }),
    ];
    const firstBefore = reviews[0]?.id;
    sortReviews(reviews, 'top-rated');
    expect(reviews[0]?.id).toBe(firstBefore);
  });
});
