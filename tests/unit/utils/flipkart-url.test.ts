import { describe, it, expect } from 'vitest';
import {
  isFlipkartUrl,
  isFlipkartProductPage,
  extractFlipkartPid,
  extractFlipkartReviewsUrl,
  constructFlipkartReviewsUrl,
} from '../../../src/utils/flipkart-url.js';

const PRODUCT_URL =
  'https://www.flipkart.com/samsung-27-inch-fhd-monitor/p/itm4720d5fd11eb3?pid=MONHGB3QZRHZ7HAQ';

describe('isFlipkartUrl', () => {
  it('matches flipkart.com', () => {
    expect(isFlipkartUrl('https://flipkart.com/some/path')).toBe(true);
  });

  it('matches www.flipkart.com', () => {
    expect(isFlipkartUrl('https://www.flipkart.com/')).toBe(true);
  });

  it('rejects amazon.com', () => {
    expect(isFlipkartUrl('https://www.amazon.com/dp/B0001')).toBe(false);
  });

  it('rejects invalid URL', () => {
    expect(isFlipkartUrl('not-a-url')).toBe(false);
  });
});

describe('isFlipkartProductPage', () => {
  it('returns true for a product URL', () => {
    expect(isFlipkartProductPage(PRODUCT_URL)).toBe(true);
  });

  it('returns false for the home page', () => {
    expect(isFlipkartProductPage('https://www.flipkart.com/')).toBe(false);
  });

  it('returns false for a product-reviews page URL', () => {
    expect(
      isFlipkartProductPage('https://www.flipkart.com/samsung-27-inch-fhd-monitor/product-reviews/itm4720d5fd11eb3?pid=XYZ'),
    ).toBe(false);
  });

  it('returns false for a search page', () => {
    expect(
      isFlipkartProductPage('https://www.flipkart.com/search?q=monitor'),
    ).toBe(false);
  });
});

describe('extractFlipkartPid', () => {
  it('extracts pid from product URL', () => {
    expect(extractFlipkartPid(PRODUCT_URL)).toBe('itm4720d5fd11eb3');
  });

  it('returns null for non-product URL', () => {
    expect(extractFlipkartPid('https://www.flipkart.com/search?q=test')).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(extractFlipkartPid('bad-url')).toBeNull();
  });
});

describe('extractFlipkartReviewsUrl', () => {
  const PID = 'itm4720d5fd11eb3';
  const REVIEWS_PATH =
    '/samsung-odyssey-g5-68-58-cm-27-inch/product-reviews/itm4720d5fd11eb3';

  function makeDoc(links: string[]): Document {
    const doc = document.implementation.createHTMLDocument();
    for (const href of links) {
      const a = doc.createElement('a');
      a.setAttribute('href', href);
      doc.body.appendChild(a);
    }
    return doc;
  }

  it('extracts path + pid param from a matching link', () => {
    const doc = makeDoc([
      `${REVIEWS_PATH}?pid=MONGZ75ZNTKDEFUV&lid=LST123&marketplace=FLIPKART`,
    ]);
    const result = extractFlipkartReviewsUrl(doc, PID);
    expect(result).toBe(
      `https://www.flipkart.com${REVIEWS_PATH}?pid=MONGZ75ZNTKDEFUV`,
    );
  });

  it('strips lid/marketplace noise, keeps only pid', () => {
    const doc = makeDoc([
      `${REVIEWS_PATH}?pid=ABC&lid=LID&marketplace=FLIPKART&sortOrder=MOST_HELPFUL`,
    ]);
    const result = extractFlipkartReviewsUrl(doc, PID);
    expect(result).toBe(`https://www.flipkart.com${REVIEWS_PATH}?pid=ABC`);
  });

  it('returns null when no matching link exists', () => {
    const doc = makeDoc(['/some-other-page?pid=XYZ']);
    expect(extractFlipkartReviewsUrl(doc, PID)).toBeNull();
  });

  it('handles a link with no pid param', () => {
    const doc = makeDoc([`${REVIEWS_PATH}?lid=LST123&marketplace=FLIPKART`]);
    const result = extractFlipkartReviewsUrl(doc, PID);
    // No pid param — returns path only (no query string)
    expect(result).toBe(`https://www.flipkart.com${REVIEWS_PATH}`);
  });
});

describe('constructFlipkartReviewsUrl', () => {
  it('converts /p/itm path to /product-reviews/itm path', () => {
    const result = constructFlipkartReviewsUrl(
      'https://www.flipkart.com/samsung-27-inch-fhd-monitor/p/itm4720d5fd11eb3?pid=MONHGB3QZRHZ7HAQ&marketplace=FLIPKART'
    );
    expect(result).toBe(
      'https://www.flipkart.com/samsung-27-inch-fhd-monitor/product-reviews/itm4720d5fd11eb3?pid=MONHGB3QZRHZ7HAQ'
    );
  });

  it('strips all params except pid', () => {
    const result = constructFlipkartReviewsUrl(
      'https://www.flipkart.com/slug/p/itmabc123?pid=XYZ&lid=LID&marketplace=FLIPKART'
    );
    expect(result).toBe('https://www.flipkart.com/slug/product-reviews/itmabc123?pid=XYZ');
  });

  it('works without pid param', () => {
    const result = constructFlipkartReviewsUrl(
      'https://www.flipkart.com/slug/p/itmabc123?marketplace=FLIPKART'
    );
    expect(result).toBe('https://www.flipkart.com/slug/product-reviews/itmabc123');
  });

  it('returns null for non-product URLs', () => {
    expect(constructFlipkartReviewsUrl('https://www.flipkart.com/')).toBeNull();
    expect(constructFlipkartReviewsUrl('https://www.flipkart.com/slug/product-reviews/itmabc123?pid=X')).toBeNull();
  });
});
