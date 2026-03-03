import { parseReviewList } from './review-list.js';
import type { ParsedReview } from './review-list.js';

const PAGE_DELAY_MS = 600;
const LOG = '[HonestReviews]';

/**
 * Star filters to fetch, in priority order.
 * Fetching one page per star tier gives a representative sample (≈50 reviews)
 * across the whole distribution.  Amazon's filterByStar values are literal.
 */
const STAR_FILTERS = [
  'three_star',
  'four_star',
  'two_star',
  'one_star',
  'five_star',
] as const;

/**
 * Fetch additional reviews from Amazon's /product-reviews/ page in the background.
 * Fetches one page per star tier so we get a representative sample.
 * Reviews from fetched pages have `element: null` (not in the current DOM).
 *
 * @param asin    - Product ASIN
 * @param signal  - AbortSignal to cancel on page unload
 * @param onPage  - Called after each page with the accumulated new reviews so far
 * @returns       - All uniquely fetched reviews
 */
export async function fetchMoreReviews(
  asin: string,
  signal: AbortSignal,
  onPage: (fetched: ParsedReview[], tierIndex: number) => void,
): Promise<ParsedReview[]> {
  const all: ParsedReview[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < STAR_FILTERS.length; i++) {
    if (signal.aborted) break;

    const starFilter = STAR_FILTERS[i]!;
    const url =
      `${window.location.origin}/product-reviews/${asin}/` +
      `?filterByStar=${starFilter}&reviewerType=all_reviews&pageNumber=1`;

    console.log(LOG, `Fetching ${starFilter} reviews…`);

    let html: string;
    try {
      const res = await fetch(url, { signal, credentials: 'include' });
      if (!res.ok) break;
      // Detect redirect to Amazon sign-in (HTTP 200 but final URL is auth page)
      if (res.url && (res.url.includes('/ap/signin') || res.url.includes('/signin'))) {
        console.warn(LOG, 'Redirected to sign-in — Amazon login required for background fetch');
        break;
      }
      html = await res.text();
    } catch {
      break; // fetch error or aborted
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pageReviews = parseReviewList(doc);

    // No reviews on page likely means CAPTCHA, redirect, or auth wall
    if (pageReviews.length === 0) {
      console.warn(LOG, `No reviews found for ${starFilter} — possible CAPTCHA or auth issue`);
      break;
    }

    // Deduplicate and strip DOM references (elements belong to the fetched document)
    const fresh = pageReviews
      .filter((r) => !seen.has(r.id))
      .map((r) => ({ ...r, element: null }));

    fresh.forEach((r) => seen.add(r.id));
    all.push(...fresh);

    console.log(LOG, `${starFilter}: +${fresh.length} new reviews (${all.length} total)`);
    onPage(all, i + 1);

    if (i < STAR_FILTERS.length - 1 && !signal.aborted) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return all;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
