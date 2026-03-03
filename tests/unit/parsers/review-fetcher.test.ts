import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMoreReviews } from '../../../src/parsers/amazon/review-fetcher.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReviewHtml(ids: string[]): string {
  const items = ids.map(
    (id) => `
    <div data-hook="review" id="${id}">
      <a data-hook="review-title">
        <i data-hook="review-star-rating" class="a-icon a-icon-star a-star-4">
          <span class="a-icon-alt">4.0 out of 5 stars</span>
        </i>
        <span class="a-letter-space"></span>
        <span>Review title for ${id}</span>
      </a>
      <span data-hook="avp-badge-linkless">Verified Purchase</span>
      <span data-hook="review-date">Reviewed in the United States on 1 January 2024</span>
      <div data-hook="review-body"><span>Body text for review ${id}.</span></div>
    </div>`,
  );
  return `<!DOCTYPE html><html><body>${items.join('')}</body></html>`;
}

function makeOkResponse(html: string) {
  return { ok: true, text: () => Promise.resolve(html) };
}

function makeSigninRedirectResponse() {
  return {
    ok: true,
    url: 'https://www.amazon.com/ap/signin?openid.return_to=some_product_page',
    text: () => Promise.resolve('<html><body>Sign in</body></html>'),
  };
}

/**
 * Run fetchMoreReviews with fake timers advanced so sleeps between pages
 * don't make tests take 3+ seconds.
 */
async function runFetch(
  asin: string,
  signal: AbortSignal,
  onPage: Parameters<typeof fetchMoreReviews>[2] = () => {},
) {
  const prom = fetchMoreReviews(asin, signal, onPage);
  await vi.runAllTimersAsync();
  return prom;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchMoreReviews', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://www.amazon.com' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches one request per star filter (5 total)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeReviewHtml(['R1'])));
    globalThis.fetch = mockFetch as any;

    await runFetch('B01TEST001', new AbortController().signal);

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('fetches star filters in priority order (3-star first)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeReviewHtml(['R1'])));
    globalThis.fetch = mockFetch as any;

    await runFetch('B01TEST001', new AbortController().signal);

    const urls = mockFetch.mock.calls.map((c: any[]) => c[0] as string);
    expect(urls[0]).toContain('filterByStar=three_star');
    expect(urls[1]).toContain('filterByStar=four_star');
    expect(urls[2]).toContain('filterByStar=two_star');
    expect(urls[3]).toContain('filterByStar=one_star');
    expect(urls[4]).toContain('filterByStar=five_star');
  });

  it('includes the ASIN and reviewerType in every URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeReviewHtml(['R1'])));
    globalThis.fetch = mockFetch as any;

    await runFetch('B07EXAMPLE', new AbortController().signal);

    for (const call of mockFetch.mock.calls) {
      const url = call[0] as string;
      expect(url).toContain('/product-reviews/B07EXAMPLE/');
      expect(url).toContain('reviewerType=all_reviews');
    }
  });

  it('uses window.location.origin as the URL base', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeReviewHtml(['R1'])));
    globalThis.fetch = mockFetch as any;

    await runFetch('BASIN12345', new AbortController().signal);

    expect(mockFetch.mock.calls[0][0] as string).toContain('https://www.amazon.com');
  });

  it('deduplicates reviews that appear in multiple star pages', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeOkResponse(makeReviewHtml(['R1', 'R2'])))
      .mockResolvedValueOnce(makeOkResponse(makeReviewHtml(['R1', 'R3']))) // R1 duplicate
      .mockResolvedValue(makeOkResponse(makeReviewHtml(['R4'])));
    globalThis.fetch = mockFetch as any;

    const result = await runFetch('B01TEST001', new AbortController().signal);

    const ids = result.map((r) => r.id);
    // R1 should appear exactly once despite being in two pages
    expect(ids.filter((id) => id === 'R1')).toHaveLength(1);
    // All unique reviews collected
    expect(ids).toContain('R2');
    expect(ids).toContain('R3');
    expect(ids).toContain('R4');
  });

  it('returns reviews with element: null (no DOM reference)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeReviewHtml(['R1', 'R2'])));
    globalThis.fetch = mockFetch as any;

    const result = await runFetch('B01TEST001', new AbortController().signal);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.element === null)).toBe(true);
  });

  it('calls onPage callback after each successful fetch', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeOkResponse(makeReviewHtml(['R1'])))
      .mockResolvedValueOnce(makeOkResponse(makeReviewHtml(['R2'])))
      .mockResolvedValue({ ok: false });
    globalThis.fetch = mockFetch as any;

    const onPage = vi.fn();
    await runFetch('B01TEST001', new AbortController().signal, onPage);

    expect(onPage).toHaveBeenCalledTimes(2);
    // Second call accumulates both pages
    expect(onPage.mock.calls[1][0]).toHaveLength(2);
  });

  it('stops immediately on a non-ok response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false });
    globalThis.fetch = mockFetch as any;

    const result = await runFetch('B01TEST001', new AbortController().signal);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(0);
  });

  it('stops fetching when the abort signal fires', async () => {
    const controller = new AbortController();
    let callCount = 0;

    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      controller.abort();
      return Promise.resolve(makeOkResponse(makeReviewHtml(['R1'])));
    });
    globalThis.fetch = mockFetch as any;

    await runFetch('B01TEST001', controller.signal);

    // Only the first call ran before the abort took effect
    expect(callCount).toBe(1);
  });

  it('handles a fetch network error gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = mockFetch as any;

    await expect(runFetch('B01TEST001', new AbortController().signal)).resolves.toEqual([]);
  });

  it('stops when Amazon redirects to sign-in page', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeSigninRedirectResponse());
    globalThis.fetch = mockFetch as any;

    const result = await runFetch('B01TEST001', new AbortController().signal);

    // Stopped after detecting the redirect — no retries
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(0);
  });

  it('stops when the fetched page contains no reviews (CAPTCHA / auth wall)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeOkResponse('<html><body><p>Please solve the CAPTCHA</p></body></html>'),
    );
    globalThis.fetch = mockFetch as any;

    const result = await runFetch('B01TEST001', new AbortController().signal);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(0);
  });
});
