import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseReviewList } from '../../../src/parsers/amazon/review-list.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureHtml = readFileSync(
  join(__dirname, '../../fixtures/amazon-product-page.html'),
  'utf-8',
);

let doc: Document;

beforeAll(() => {
  const dom = new JSDOM(fixtureHtml);
  doc = dom.window.document;
});

describe('parseReviewList', () => {
  it('parses all 5 reviews', () => {
    const reviews = parseReviewList(doc);
    expect(reviews).toHaveLength(5);
  });

  it('correctly identifies verified reviews', () => {
    const reviews = parseReviewList(doc);
    const verified = reviews.filter((r) => r.isVerified);
    expect(verified).toHaveLength(4); // Reviews 1, 3, 4, 5 are verified
  });

  it('parses star ratings correctly', () => {
    const reviews = parseReviewList(doc);
    expect(reviews[0]?.rating).toBe(5);
    expect(reviews[2]?.rating).toBe(2);
    expect(reviews[3]?.rating).toBe(1);
    expect(reviews[4]?.rating).toBe(4);
  });

  it('parses helpful votes', () => {
    const reviews = parseReviewList(doc);
    expect(reviews[0]?.helpfulVotes).toBe(23);
    expect(reviews[2]?.helpfulVotes).toBe(47);
    expect(reviews[1]?.helpfulVotes).toBe(0);
  });

  it('detects review with images and captures URLs', () => {
    const reviews = parseReviewList(doc);
    const withImages = reviews.filter((r) => r.hasImages);
    expect(withImages).toHaveLength(1);
    expect(withImages[0]?.id).toContain('R5VERIFIED4STAR');
    // URL should be captured and upsized from _SL64_ to _SL200_
    expect(withImages[0]?.images).toHaveLength(1);
    expect(withImages[0]?.images[0]).toContain('._SL200_.');
  });

  it('strips star rating text from title', () => {
    const reviews = parseReviewList(doc);
    // Title should NOT contain "5.0 out of 5 stars"
    expect(reviews[0]?.title).toBe('Excellent product, works as described');
    expect(reviews[0]?.title).not.toMatch(/\d+\.\d+ out of \d+ stars?/i);
  });

  it('filters media-error text from review body', () => {
    const reviews = parseReviewList(doc);
    // Review 2 has "The media could not be loaded." — should return empty
    expect(reviews[1]?.body).toBe('');
    expect(reviews[1]?.bodyLength).toBe(0);
  });

  it('parses review body length', () => {
    const reviews = parseReviewList(doc);
    expect(reviews[0]?.bodyLength).toBeGreaterThan(50);
    expect(reviews[2]?.bodyLength).toBeGreaterThan(200);
  });

  it('parses review dates', () => {
    const reviews = parseReviewList(doc);
    expect(reviews[0]?.date).not.toBeNull();
    const date = reviews[0]?.date!;
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11); // December (0-indexed)
  });
});
