import { isProductPage, extractAsin, AMAZON_MATCHES } from '../utils/amazon-url.js';
import { parseProductPage } from '../parsers/amazon/product-page.js';
import { parseReviewList } from '../parsers/amazon/review-list.js';
import { fetchMoreReviews } from '../parsers/amazon/review-fetcher.js';
import type { SiteAdapter } from './adapter.js';

export { AMAZON_MATCHES };

/**
 * Creates a SiteAdapter for the current Amazon product page, or returns null
 * if the URL is not a recognised Amazon product page.
 */
export function createAmazonAdapter(url: string): SiteAdapter | null {
  if (!isProductPage(url)) return null;

  const asin = extractAsin(url);
  if (!asin) return null;

  return {
    parseProductPage,
    parseReviewList,
    fetchReviews: fetchMoreReviews,
    getReviewsFetchId: () => asin,
    reviewContainerSelectors: [
      '#cm-cr-dp-review-list',
      '[data-hook="cr-dp-review-list"]',
      '#customer-reviews-content',
      // Individual review elements — used as a poll fallback when the
      // container hasn't loaded yet on slow connections.
      '[data-hook="review"]',
      '[id^="customer_review-"]',
    ],
    // Amazon exposes all review signals — no override needed.
  };
}
