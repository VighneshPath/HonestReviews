import { parseFlipkartReviewList } from './review-list.js';
import type { ParsedReview } from './review-list.js';
import { parseHistogramFromText } from './product-page.js';
import type { StarDistribution } from '../amazon/product-page.js';
import { sleep, deduplicateReviews } from '../fetch-utils.js';

const PAGE_DELAY_MS = 600;
const LOG = '[HonestReviews]';

/**
 * Fetch tiers in priority order — targeting ~50 reviews, mirroring Amazon's approach.
 *
 * Flipkart's SSR supports sortOrder=MOST_HELPFUL|NEGATIVE_FIRST|POSITIVE_FIRST.
 * ratingFilter is client-side only and ignored by SSR.
 *
 * Strategy: critical reviews first (most signal), then helpful cross-section,
 * then positive. Tier 0 must be MOST_HELPFUL p1 — it's the histogram source.
 */
const FETCH_TIERS: Array<{ sortOrder: string; pageNumber: number }> = [
  { sortOrder: 'MOST_HELPFUL',   pageNumber: 1 }, // histogram source + cross-section
  { sortOrder: 'NEGATIVE_FIRST', pageNumber: 1 }, // critical/low-star reviews
  { sortOrder: 'MOST_HELPFUL',   pageNumber: 2 }, // more helpful reviews
  { sortOrder: 'NEGATIVE_FIRST', pageNumber: 2 }, // more critical
  { sortOrder: 'POSITIVE_FIRST', pageNumber: 1 }, // positive reviews (last)
];

/**
 * Fetch additional Flipkart reviews in the background.
 *
 * @param reviewsBaseUrl - Full reviews page URL, e.g.
 *                         https://www.flipkart.com/{slug}/product-reviews/{itm}?pid=X
 * @param signal         - AbortSignal to cancel on page unload
 * @param onPage         - Called after each tier with accumulated reviews and optional histogram
 */
export async function fetchFlipkartReviews(
  reviewsBaseUrl: string,
  signal: AbortSignal,
  onPage: (fetched: ParsedReview[], tierIndex: number, histogram?: StarDistribution[]) => void,
): Promise<ParsedReview[]> {
  const all: ParsedReview[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < FETCH_TIERS.length; i++) {
    if (signal.aborted) break;

    const tier = FETCH_TIERS[i]!;
    const label = `${tier.sortOrder} p${tier.pageNumber}`;

    let fetchUrl: string;
    try {
      const u = new URL(reviewsBaseUrl);
      u.searchParams.set('sortOrder', tier.sortOrder);
      u.searchParams.set('pageNumber', String(tier.pageNumber));
      fetchUrl = u.toString();
    } catch {
      break;
    }

    console.log(LOG, `Fetching Flipkart ${label}…`);

    let html: string;
    try {
      const res = await fetch(fetchUrl, {
        signal,
        credentials: 'include',
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      if (!res.ok) {
        console.warn(LOG, `Flipkart fetch ${label}: HTTP ${res.status}`);
        break;
      }
      if (res.url && /\/login|\/signin/i.test(res.url)) {
        console.warn(LOG, 'Flipkart redirected to login — skipping background fetch');
        break;
      }
      html = await res.text();
    } catch {
      break;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pageReviews = parseFlipkartReviewList(doc);

    if (pageReviews.length === 0) {
      console.warn(LOG, `No reviews parsed for ${label} — possible CAPTCHA or selector mismatch`);
      // Salvage histogram from first tier even if reviews didn't parse
      if (i === 0) {
        const bodyText = doc.body?.textContent ?? doc.documentElement?.textContent ?? '';
        const histogram = parseHistogramFromText(bodyText);
        if (histogram.length > 0) onPage([], 1, histogram);
      }
      continue;
    }

    const fresh = deduplicateReviews(pageReviews, seen);
    all.push(...fresh);

    console.log(LOG, `Flipkart ${label}: +${fresh.length} new (${all.length} total)`);

    // Extract histogram from the first tier's page text
    if (i === 0) {
      const bodyText = doc.body?.textContent ?? doc.documentElement?.textContent ?? '';
      const histogram = parseHistogramFromText(bodyText);
      console.log(LOG, `Histogram: found ${histogram.length} tiers from ${bodyText.length} chars`);
      onPage(all, i + 1, histogram.length > 0 ? histogram : undefined);
    } else {
      onPage(all, i + 1);
    }

    if (i < FETCH_TIERS.length - 1 && !signal.aborted) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return all;
}

