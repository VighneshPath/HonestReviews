import {
  isFlipkartProductPage,
  extractFlipkartPid,
  extractFlipkartReviewsUrl,
  FLIPKART_MATCHES,
} from '../utils/flipkart-url.js';
import { parseFlipkartProductPage } from '../parsers/flipkart/product-page.js';
import { parseFlipkartReviewList } from '../parsers/flipkart/review-list.js';
import { fetchFlipkartReviews } from '../parsers/flipkart/review-fetcher.js';
import type { SiteAdapter } from './adapter.js';
import type { ReviewSignal } from '../stats/review-quality.js';

export { FLIPKART_MATCHES };

/**
 * Flipkart review pages do not expose helpful-vote counts or a dedicated
 * images field, so those signals are excluded from quality scoring.
 */
const FLIPKART_SIGNALS: ReadonlySet<ReviewSignal> = new Set([
  'length',
  'verified',
  'recency',
  'nuancedRating',
]);

/**
 * Creates a SiteAdapter for the current Flipkart product page, or returns null
 * if the URL is not a recognised Flipkart product page.
 */
export function createFlipkartAdapter(url: string): SiteAdapter | null {
  if (!isFlipkartProductPage(url)) return null;

  const pid = extractFlipkartPid(url);
  if (!pid) return null;

  return {
    parseProductPage: parseFlipkartProductPage,
    parseReviewList: parseFlipkartReviewList,
    fetchReviews: fetchFlipkartReviews,
    getReviewsFetchId: () => extractFlipkartReviewsUrl(document, pid),
    reviewContainerSelectors: [
      'div.vQDoqR',
      '[class*="reviewCard"]',
    ],
    reviewSignals: FLIPKART_SIGNALS,
  };
}
