import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFlipkartReviews } from '../../../../src/parsers/flipkart/review-fetcher.js';

// Minimal review card HTML that parseFlipkartReviewList can find
function makeReviewPageHtml(opts: { withHistogram?: boolean } = {}): string {
  const histogram = opts.withHistogram
    ? '<p>258 ratings and 16 reviews 1 \u2605 16 2 \u2605 3 3 \u2605 11 4 \u2605 51 5 \u2605 177</p>'
    : '';
  return `<html><body>
    ${histogram}
    <div class="vQDoqR">
      <div dir="auto" class="css-1rynq56">5</div>
      <div class="v1zwn21k v1zwn24">Great product</div>
      <div class="v1zwn21k v1zwn26">Really good monitor.</div>
      <div class="v1zwn21k v1zwn27">Tester One</div>
      <div class="v1zwn21l v1zwn28">Verified Buyer</div>
      <div class="v1zwn21l v1zwn28">1 year ago</div>
    </div>
  </body></html>`;
}

describe('fetchFlipkartReviews', () => {
  beforeEach(() => {
    // @ts-ignore
    global.window = { location: { origin: 'https://www.flipkart.com' } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs URL with sortOrder and pageNumber from base URL', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return { ok: true, url, text: async () => makeReviewPageHtml() } as Response;
    });

    const base = 'https://www.flipkart.com/some-slug/product-reviews/itm123?pid=XYZ';
    await fetchFlipkartReviews(base, new AbortController().signal, () => {});

    expect(fetched[0]).toContain('sortOrder=MOST_HELPFUL');
    expect(fetched[0]).toContain('pageNumber=1');
    expect(fetched[0]).toContain('pid=XYZ'); // preserves existing params
    expect(fetched[1]).toContain('sortOrder=NEGATIVE_FIRST');
    expect(fetched[1]).toContain('pageNumber=1');
    expect(fetched[2]).toContain('sortOrder=MOST_HELPFUL');
    expect(fetched[2]).toContain('pageNumber=2');
    expect(fetched[4]).toContain('sortOrder=POSITIVE_FIRST');
  });

  it('passes histogram data to onPage callback on first page', async () => {
    vi.stubGlobal('fetch', async (url: string) => ({
      ok: true,
      url,
      text: async () => makeReviewPageHtml({ withHistogram: true }),
    } as Response));

    const histograms: (unknown[] | undefined)[] = [];
    await fetchFlipkartReviews(
      'https://www.flipkart.com/slug/product-reviews/itm123?pid=X',
      new AbortController().signal,
      (_batch, _tier, histogram) => { histograms.push(histogram); },
    );

    // First page callback should include histogram
    expect(histograms[0]).toBeDefined();
    expect(histograms[0]).toHaveLength(5);
    // Subsequent pages should not re-send histogram
    expect(histograms[1]).toBeUndefined();
    expect(histograms[2]).toBeUndefined();
  });

  it('does not pass histogram when page has no star data', async () => {
    vi.stubGlobal('fetch', async (url: string) => ({
      ok: true,
      url,
      text: async () => makeReviewPageHtml({ withHistogram: false }),
    } as Response));

    const histograms: (unknown[] | undefined)[] = [];
    await fetchFlipkartReviews(
      'https://www.flipkart.com/slug/product-reviews/itm123?pid=X',
      new AbortController().signal,
      (_batch, _tier, histogram) => { histograms.push(histogram); },
    );

    expect(histograms[0]).toBeUndefined();
  });

  it('deduplicates reviews across pages', async () => {
    vi.stubGlobal('fetch', async (url: string) => ({
      ok: true,
      url,
      text: async () => makeReviewPageHtml(),
    } as Response));

    const batches: number[] = [];
    await fetchFlipkartReviews(
      'https://www.flipkart.com/slug/product-reviews/itm123?pid=X',
      new AbortController().signal,
      (batch) => { batches.push(batch.length); },
    );

    // First page: 1 new review added
    expect(batches[0]).toBe(1);
    // All subsequent pages return same review — deduped, total stays at 1
    expect(batches.every(n => n === 1)).toBe(true);
    // All 5 tiers called onPage
    expect(batches).toHaveLength(5);
  });

  it('stops on non-ok HTTP response', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      return { ok: false, status: 404, url: '' } as Response;
    });

    await fetchFlipkartReviews(
      'https://www.flipkart.com/slug/product-reviews/itm123?pid=X',
      new AbortController().signal,
      () => {},
    );

    expect(calls).toBe(1);
  });

  it('stops when redirected to login', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      url: 'https://www.flipkart.com/login?next=/product-reviews/',
      text: async () => '<html></html>',
    } as Response));

    const batches: number[] = [];
    await fetchFlipkartReviews(
      'https://www.flipkart.com/slug/product-reviews/itm123?pid=X',
      new AbortController().signal,
      (batch) => batches.push(batch.length),
    );

    expect(batches).toHaveLength(0);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    let calls = 0;

    vi.stubGlobal('fetch', async () => {
      calls++;
      controller.abort();
      return { ok: true, url: '', text: async () => makeReviewPageHtml() } as Response;
    });

    await fetchFlipkartReviews(
      'https://www.flipkart.com/slug/product-reviews/itm123?pid=X',
      controller.signal,
      () => {},
    );

    expect(calls).toBe(1); // aborted after first fetch
  });
});
