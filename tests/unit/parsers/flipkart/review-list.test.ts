import { describe, it, expect } from 'vitest';
import { parseFlipkartReviewList, stripFlipkartReadMore } from '../../../../src/parsers/flipkart/review-list.js';

// Product-page format: review cards use vQDoqR class
function makeProductPageHtml(): string {
  return `<html><body>
    <div class="vQDoqR">
      <div dir="auto" class="css-1rynq56">4</div>
      <div class="v1zwn21k v1zwn24">Good laptop</div>
      <div class="v1zwn21k v1zwn26">Solid build, great display.</div>
      <div class="v1zwn21k v1zwn27">Ravi Kumar</div>
      <div class="v1zwn21l v1zwn28">Verified Buyer</div>
      <div class="v1zwn21l v1zwn28">3 months ago</div>
    </div>
    <div class="vQDoqR">
      <div dir="auto" class="css-1rynq56">2</div>
      <div class="v1zwn21k v1zwn24">Disappointing</div>
      <div class="v1zwn21k v1zwn26">Battery drains fast.</div>
      <div class="v1zwn21k v1zwn27">Priya Singh</div>
      <div class="v1zwn21l v1zwn28">1 year ago</div>
    </div>
  </body></html>`;
}

// Product-page format with truncated body (Flipkart wraps in <a> with "...more")
function makeTruncatedProductPageHtml(): string {
  return `<html><body>
    <div class="vQDoqR">
      <div dir="auto" class="css-1rynq56">5</div>
      <div class="v1zwn21k v1zwn24">Amazing watch</div>
      <div class="v1zwn21k v1zwn26"><a href="/product-reviews/itm123">Battery life is excellent and the display looks gorgeous...more</a></div>
      <div class="v1zwn21k v1zwn27">Suresh Patel</div>
      <div class="v1zwn21l v1zwn28">Verified Buyer</div>
      <div class="v1zwn21l v1zwn28">2 months ago</div>
    </div>
  </body></html>`;
}

// Reviews-page format: cards identified by "Review for:" child element
function makeReviewsPageHtml(): string {
  return `<html><body>
    <div class="css-175oi2r">
      <div class="css-175oi2r">
        <div class="css-175oi2r" style="flex-direction:row">
          <div dir="auto" class="css-1rynq56" style="color:rgba(14,119,45,1.00)">5.0</div>
          <div dir="auto" class="css-1rynq56">•</div>
        </div>
        <div dir="auto" class="css-1rynq56">Fabulous purchase</div>
      </div>
      <div dir="auto" class="css-1rynq56">Review for: Color Silver • SSD 512 GB</div>
      <div>Great laptop, very lightweight and fast.</div>
      <div class="css-175oi2r">
        <div class="css-175oi2r">
          <div class="css-1rynq56">Amit Sharma</div>
          <div class="css-1rynq56">, Mumbai</div>
        </div>
        <div class="css-175oi2r">Helpful for 42Verified Purchase · 2 months ago</div>
      </div>
    </div>
    <div class="css-175oi2r">
      <div class="css-175oi2r">
        <div class="css-175oi2r" style="flex-direction:row">
          <div dir="auto" class="css-1rynq56" style="color:rgba(220,68,68,1.00)">2.0</div>
          <div dir="auto" class="css-1rynq56">•</div>
        </div>
        <div dir="auto" class="css-1rynq56">Poor quality</div>
      </div>
      <div dir="auto" class="css-1rynq56">Review for: Color Black • SSD 256 GB</div>
      <div>Stopped working after a month.</div>
      <div class="css-175oi2r">Neha Verma , Delhi 3 months ago</div>
    </div>
  </body></html>`;
}

// SSR format: server-rendered HTML uses css-146c3p1 instead of css-1rynq56
function makeSsrHtml(): string {
  return `<html><body>
    <div class="css-g5y9jx">
      <div class="css-g5y9jx">
        <div class="css-146c3p1">5</div>
        <div class="css-146c3p1">Excellent product</div>
      </div>
      <div class="css-146c3p1">Review for: Color Black • RAM 8 GB</div>
      <div>Works perfectly, no complaints at all.</div>
      <div class="css-g5y9jx">Verified Purchase · Sep, 2024</div>
    </div>
    <div class="css-g5y9jx">
      <div class="css-g5y9jx">
        <div class="css-146c3p1">2</div>
        <div class="css-146c3p1">Disappointing</div>
      </div>
      <div class="css-146c3p1">Review for: Color White • RAM 16 GB</div>
      <div>Battery drains in 2 hours.</div>
      <div class="css-g5y9jx">Verified Buyer · Oct, 2024</div>
    </div>
  </body></html>`;
}

function parse(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseFlipkartReviewList(doc);
}

describe('parseFlipkartReviewList — product-page format (vQDoqR)', () => {
  it('parses rating from integer digit', () => {
    const reviews = parse(makeProductPageHtml());
    expect(reviews[0].rating).toBe(4);
    expect(reviews[1].rating).toBe(2);
  });

  it('parses title, body, reviewer name', () => {
    const reviews = parse(makeProductPageHtml());
    expect(reviews[0].title).toBe('Good laptop');
    expect(reviews[0].body).toBe('Solid build, great display.');
    expect(reviews[0].reviewerName).toBe('Ravi Kumar');
  });

  it('detects verified buyer', () => {
    const reviews = parse(makeProductPageHtml());
    expect(reviews[0].isVerified).toBe(true);
    expect(reviews[1].isVerified).toBe(false);
  });

  it('parses relative date', () => {
    const reviews = parse(makeProductPageHtml());
    expect(reviews[0].dateText).toMatch(/3 months ago/i);
  });

  it('generates stable IDs', () => {
    const reviews = parse(makeProductPageHtml());
    expect(reviews[0].id).not.toBe(reviews[1].id);
    // ID is stable across re-parses
    const reviews2 = parse(makeProductPageHtml());
    expect(reviews[0].id).toBe(reviews2[0].id);
  });
});

describe('parseFlipkartReviewList — reviews-page format (css-175oi2r fallback)', () => {
  it('finds review cards via "Review for:" child', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews).toHaveLength(2);
  });

  it('parses rating from decimal format "5.0"', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews[0].rating).toBe(5);
    expect(reviews[1].rating).toBe(2);
  });

  it('parses title from first child of review card', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews[0].title).toBe('Fabulous purchase');
    expect(reviews[1].title).toBe('Poor quality');
  });

  it('parses body from sibling after "Review for:"', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews[0].body).toBe('Great laptop, very lightweight and fast.');
    expect(reviews[1].body).toBe('Stopped working after a month.');
  });

  it('detects verified purchase from card text', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews[0].isVerified).toBe(true);
    expect(reviews[1].isVerified).toBe(false);
  });

  it('extracts date from meta text', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews[0].dateText).toMatch(/2 months ago/i);
  });

  it('generates unique stable IDs', () => {
    const reviews = parse(makeReviewsPageHtml());
    expect(reviews[0].id).not.toBe(reviews[1].id);
  });
});

describe('parseFlipkartReviewList — SSR format (css-146c3p1 fallback)', () => {
  it('finds review cards via "Review for:" in css-146c3p1 elements', () => {
    const reviews = parse(makeSsrHtml());
    expect(reviews).toHaveLength(2);
  });

  it('parses rating from integer digit', () => {
    const reviews = parse(makeSsrHtml());
    expect(reviews[0].rating).toBe(5);
    expect(reviews[1].rating).toBe(2);
  });

  it('detects verified status', () => {
    const reviews = parse(makeSsrHtml());
    expect(reviews[0].isVerified).toBe(true);
    expect(reviews[1].isVerified).toBe(true);
  });

  it('generates unique stable IDs', () => {
    const reviews = parse(makeSsrHtml());
    expect(reviews[0].id).not.toBe(reviews[1].id);
  });
});

describe('parseFlipkartReviewList — truncated product-page bodies', () => {
  it('strips trailing "...more" from body so panel shows clean text', () => {
    const reviews = parse(makeTruncatedProductPageHtml());
    expect(reviews[0].body).toBe('Battery life is excellent and the display looks gorgeous');
    expect(reviews[0].body).not.toMatch(/more$/i);
  });
});

describe('stripFlipkartReadMore', () => {
  it('strips "...more" suffix', () => {
    expect(stripFlipkartReadMore('Great product...more')).toBe('Great product');
  });

  it('strips unicode ellipsis "…more" suffix', () => {
    expect(stripFlipkartReadMore('Great product…more')).toBe('Great product');
  });

  it('strips with trailing whitespace', () => {
    expect(stripFlipkartReadMore('Great product...more  ')).toBe('Great product');
  });

  it('is case-insensitive', () => {
    expect(stripFlipkartReadMore('Great product...More')).toBe('Great product');
  });

  it('does not modify text without truncation marker', () => {
    expect(stripFlipkartReadMore('Great product, no issues.')).toBe('Great product, no issues.');
  });

  it('does not strip standalone "more" without preceding dots', () => {
    expect(stripFlipkartReadMore('I want more')).toBe('I want more');
  });
});
