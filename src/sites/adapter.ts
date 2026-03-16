import type { ParsedReview } from '../parsers/review.js';
import type { ProductPageData, StarDistribution } from '../parsers/product.js';
import type { ReviewSignal } from '../stats/review-quality.js';

/**
 * Per-site plugin interface. Each supported site provides one implementation.
 *
 * content.ts depends only on this abstraction — it never imports Amazon or
 * Flipkart modules directly. Adding a new site means creating a new adapter
 * and registering it; the orchestration layer needs no changes.
 */
export interface SiteAdapter {
  /** Parse the product summary (rating histogram, average, count) from the current page. */
  parseProductPage: (doc: Document) => ProductPageData;

  /** Parse the reviews currently visible in the DOM. */
  parseReviewList: (doc: Document) => ParsedReview[];

  /**
   * Background-fetch additional reviews, calling `onPage` progressively after each batch.
   *
   * @param id      - Site-specific fetch key (ASIN for Amazon, reviews base URL for Flipkart).
   * @param signal  - AbortSignal — cancel on page unload or disable.
   * @param onPage  - Called after each batch with the accumulated reviews so far.
   *                  `histogram` is optional — only provided by sites whose reviews pages
   *                  include the histogram (currently Flipkart).
   */
  fetchReviews: (
    id: string,
    signal: AbortSignal,
    onPage: (batch: ParsedReview[], tier: number, histogram?: StarDistribution[]) => void,
  ) => Promise<ParsedReview[]>;

  /**
   * Returns the fetch key when the DOM is ready, or null if unavailable.
   * Called just before background fetching starts.
   */
  getReviewsFetchId: () => string | null;

  /**
   * CSS selectors for the review container. Used to:
   *   1. Poll until reviews have loaded after page navigation.
   *   2. Scope the MutationObserver to the right subtree.
   */
  reviewContainerSelectors: string[];

  /**
   * Quality scoring signals available on this site.
   *
   * Scores are normalised to 100 against the max achievable with these signals,
   * so sites with fewer data points (e.g. Flipkart has no helpful-votes data)
   * still produce meaningful quality scores.
   *
   * Defaults to ALL_SIGNALS when omitted (all signals available).
   */
  reviewSignals?: ReadonlySet<ReviewSignal>;
}
