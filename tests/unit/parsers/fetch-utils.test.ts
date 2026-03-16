import { describe, it, expect } from 'vitest';
import { deduplicateReviews } from '../../../src/parsers/fetch-utils.js';
import type { ParsedReview } from '../../../src/parsers/amazon/review-list.js';

function makeReview(id: string): ParsedReview {
  return {
    id,
    element: document.createElement('div'),
    rating: 4,
    title: 'Title',
    body: 'Body',
    isVerified: true,
    date: null,
    dateText: '',
    helpfulVotes: 0,
    hasImages: false,
    images: [],
    reviewerName: '',
    bodyLength: 4,
  };
}

describe('deduplicateReviews', () => {
  it('returns all reviews when none are in the seen set', () => {
    const seen = new Set<string>();
    const result = deduplicateReviews([makeReview('R1'), makeReview('R2')], seen);
    expect(result.map((r) => r.id)).toEqual(['R1', 'R2']);
  });

  it('filters out reviews whose IDs are already in seen', () => {
    const seen = new Set<string>(['R1']);
    const result = deduplicateReviews([makeReview('R1'), makeReview('R2')], seen);
    expect(result.map((r) => r.id)).toEqual(['R2']);
  });

  it('sets element to null on all returned reviews', () => {
    const seen = new Set<string>();
    const result = deduplicateReviews([makeReview('R1')], seen);
    expect(result[0]!.element).toBeNull();
  });

  it('adds new IDs to the seen set', () => {
    const seen = new Set<string>();
    deduplicateReviews([makeReview('R1'), makeReview('R2')], seen);
    expect(seen.has('R1')).toBe(true);
    expect(seen.has('R2')).toBe(true);
  });

  it('does not add already-seen IDs again', () => {
    const seen = new Set<string>(['R1']);
    deduplicateReviews([makeReview('R1')], seen);
    expect(seen.size).toBe(1);
  });

  it('returns an empty array for an empty input', () => {
    expect(deduplicateReviews([], new Set())).toEqual([]);
  });

  it('successive calls accumulate deduplication across batches', () => {
    const seen = new Set<string>();
    const batch1 = deduplicateReviews([makeReview('R1'), makeReview('R2')], seen);
    const batch2 = deduplicateReviews([makeReview('R2'), makeReview('R3')], seen);
    expect(batch1.map((r) => r.id)).toEqual(['R1', 'R2']);
    expect(batch2.map((r) => r.id)).toEqual(['R3']);
  });
});
