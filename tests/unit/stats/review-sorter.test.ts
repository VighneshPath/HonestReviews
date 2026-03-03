import { describe, it, expect, beforeEach } from 'vitest';
import { sortReviews, applyDOMSort } from '../../../src/stats/review-sorter.js';
import type { ParsedReview } from '../../../src/parsers/amazon/review-list.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    reviewerName: 'Tester',
    bodyLength: 200,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sortReviews
// ---------------------------------------------------------------------------

describe('sortReviews', () => {
  it('most-helpful sorts by helpfulVotes descending', () => {
    const reviews = [
      makeReview({ id: 'a', helpfulVotes: 3 }),
      makeReview({ id: 'b', helpfulVotes: 20 }),
      makeReview({ id: 'c', helpfulVotes: 0 }),
    ];
    const sorted = sortReviews(reviews, 'most-helpful');
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('top-rated sorts by rating descending', () => {
    const reviews = [
      makeReview({ id: 'a', rating: 3 }),
      makeReview({ id: 'b', rating: 5 }),
      makeReview({ id: 'c', rating: 1 }),
    ];
    const sorted = sortReviews(reviews, 'top-rated');
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('critical sorts by rating ascending', () => {
    const reviews = [
      makeReview({ id: 'a', rating: 3 }),
      makeReview({ id: 'b', rating: 5 }),
      makeReview({ id: 'c', rating: 1 }),
    ];
    const sorted = sortReviews(reviews, 'critical');
    expect(sorted.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('recent sorts by date descending', () => {
    const reviews = [
      makeReview({ id: 'a', date: new Date('2023-01-01') }),
      makeReview({ id: 'b', date: new Date('2024-06-01') }),
      makeReview({ id: 'c', date: new Date('2022-01-01') }),
    ];
    const sorted = sortReviews(reviews, 'recent');
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('most-informative scores verified > unverified with same content', () => {
    const verifiedReview = makeReview({ id: 'verified', isVerified: true, bodyLength: 500, helpfulVotes: 10 });
    const unverifiedReview = makeReview({ id: 'unverified', isVerified: false, bodyLength: 500, helpfulVotes: 10 });
    const sorted = sortReviews([unverifiedReview, verifiedReview], 'most-informative');
    expect(sorted[0]?.id).toBe('verified');
  });

  it('most-informative ranks 2-3 star reviews higher (nuanced bonus)', () => {
    const nuanced = makeReview({ id: 'nuanced', rating: 3, bodyLength: 400, isVerified: true });
    const fiveStar = makeReview({ id: 'fivestar', rating: 5, bodyLength: 400, isVerified: true });
    const sorted = sortReviews([fiveStar, nuanced], 'most-informative');
    expect(sorted[0]?.id).toBe('nuanced');
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
    const original = [...reviews];
    sortReviews(reviews, 'top-rated');
    expect(reviews[0]?.id).toBe(original[0]?.id);
  });
});

// ---------------------------------------------------------------------------
// applyDOMSort
// ---------------------------------------------------------------------------

describe('applyDOMSort', () => {
  let parent: HTMLElement;
  let el1: HTMLElement;
  let el2: HTMLElement;
  let el3: HTMLElement;

  beforeEach(() => {
    parent = document.createElement('ul');
    el1 = document.createElement('li');
    el1.id = 'R1';
    el2 = document.createElement('li');
    el2.id = 'R2';
    el3 = document.createElement('li');
    el3.id = 'R3';
    parent.appendChild(el1);
    parent.appendChild(el2);
    parent.appendChild(el3);
    document.body.appendChild(parent);
  });

  it('reorders DOM elements to match sorted order', () => {
    const reviews = [
      makeReview({ id: 'R3', element: el3 }),
      makeReview({ id: 'R1', element: el1 }),
      makeReview({ id: 'R2', element: el2 }),
    ];
    applyDOMSort(reviews);
    const ids = Array.from(parent.children).map((c) => c.id);
    expect(ids).toEqual(['R3', 'R1', 'R2']);
  });

  it('ignores reviews with element: null without throwing', () => {
    const reviews = [
      makeReview({ id: 'fetched-1', element: null }),
      makeReview({ id: 'R2', element: el2 }),
      makeReview({ id: 'fetched-2', element: null }),
      makeReview({ id: 'R1', element: el1 }),
    ];
    expect(() => applyDOMSort(reviews)).not.toThrow();
    // Only DOM reviews are sorted; fetched reviews don't affect the DOM
    const ids = Array.from(parent.children).map((c) => c.id);
    expect(ids).toContain('R1');
    expect(ids).toContain('R2');
  });

  it('does nothing when all reviews have element: null', () => {
    const reviews = [
      makeReview({ id: 'fetched-1', element: null }),
      makeReview({ id: 'fetched-2', element: null }),
    ];
    const before = Array.from(parent.children).map((c) => c.id);
    applyDOMSort(reviews);
    const after = Array.from(parent.children).map((c) => c.id);
    expect(after).toEqual(before);
  });

  it('does nothing when the array is empty', () => {
    const before = Array.from(parent.children).map((c) => c.id);
    applyDOMSort([]);
    const after = Array.from(parent.children).map((c) => c.id);
    expect(after).toEqual(before);
  });
});
