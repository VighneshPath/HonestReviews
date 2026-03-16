import { describe, it, expect } from 'vitest';
import { isAmazonUrl, isProductPage, extractAsin } from '../../../src/utils/amazon-url.js';

describe('isAmazonUrl', () => {
  it('recognises amazon.com', () => {
    expect(isAmazonUrl('https://www.amazon.com/foo')).toBe(true);
  });

  it('recognises international domains', () => {
    expect(isAmazonUrl('https://www.amazon.co.uk/foo')).toBe(true);
    expect(isAmazonUrl('https://www.amazon.de/foo')).toBe(true);
    expect(isAmazonUrl('https://www.amazon.in/foo')).toBe(true);
  });

  it('rejects non-Amazon domains', () => {
    expect(isAmazonUrl('https://www.google.com/')).toBe(false);
    expect(isAmazonUrl('https://flipkart.com/')).toBe(false);
    expect(isAmazonUrl('https://fakeamazon.com/')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isAmazonUrl('not-a-url')).toBe(false);
  });
});

describe('isProductPage', () => {
  it('detects /dp/ product URLs', () => {
    expect(isProductPage('https://www.amazon.com/dp/B08N5WRWNW')).toBe(true);
  });

  it('detects /gp/product/ URLs', () => {
    expect(isProductPage('https://www.amazon.com/gp/product/B08N5WRWNW')).toBe(true);
  });

  it('detects product URLs with trailing slugs', () => {
    expect(isProductPage('https://www.amazon.com/Some-Product-Name/dp/B08N5WRWNW/ref=cm_cr_dp')).toBe(true);
  });

  it('rejects non-product pages', () => {
    expect(isProductPage('https://www.amazon.com/s?k=laptop')).toBe(false);
    expect(isProductPage('https://www.amazon.com/')).toBe(false);
  });

  it('rejects non-Amazon URLs', () => {
    expect(isProductPage('https://www.example.com/dp/B08N5WRWNW')).toBe(false);
  });
});

describe('extractAsin', () => {
  it('extracts ASIN from /dp/ path', () => {
    expect(extractAsin('https://www.amazon.com/dp/B08N5WRWNW')).toBe('B08N5WRWNW');
  });

  it('extracts ASIN from /gp/product/ path', () => {
    expect(extractAsin('https://www.amazon.com/gp/product/B0C1234567')).toBe('B0C1234567');
  });

  it('extracts ASIN when surrounded by slug and query string', () => {
    expect(extractAsin('https://www.amazon.com/Widget-Pro/dp/B08N5WRWNW?th=1')).toBe('B08N5WRWNW');
  });

  it('returns null when no ASIN is present', () => {
    expect(extractAsin('https://www.amazon.com/s?k=laptop')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(extractAsin('not-a-url')).toBeNull();
  });
});
