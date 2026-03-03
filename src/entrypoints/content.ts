import { isProductPage, extractAsin } from '../utils/amazon-url.js';
import { parseProductPage } from '../parsers/amazon/product-page.js';
import type { ProductPageData } from '../parsers/amazon/product-page.js';
import { parseReviewList } from '../parsers/amazon/review-list.js';
import type { ParsedReview } from '../parsers/amazon/review-list.js';
import { fetchMoreReviews } from '../parsers/amazon/review-fetcher.js';
import { calculateAdjustedRating } from '../stats/adjusted-rating.js';
import type { AdjustedRatingResult } from '../stats/adjusted-rating.js';
import { analyzeDistribution } from '../stats/distribution-analysis.js';
import type { DistributionAnalysis } from '../stats/distribution-analysis.js';
import { analyzeTimeline } from '../stats/timeline-analysis.js';
import type { TimelineAnalysis } from '../stats/timeline-analysis.js';
import '../components/overlay-panel.js';
import '../components/quality-badge.js';
import type { OverlayPanel } from '../components/overlay-panel.js';

const LOG = '[HonestReviews]';

export default defineContentScript({
  matches: [
    '*://*.amazon.com/*',
    '*://*.amazon.co.uk/*',
    '*://*.amazon.de/*',
    '*://*.amazon.fr/*',
    '*://*.amazon.it/*',
    '*://*.amazon.es/*',
    '*://*.amazon.ca/*',
    '*://*.amazon.com.au/*',
    '*://*.amazon.co.jp/*',
    '*://*.amazon.in/*',
  ],
  runAt: 'document_idle',
  // Run in the page's main world so Lit's customElements.define() works.
  // Firefox extension isolated worlds return null for customElements, breaking Lit.
  world: 'MAIN',

  async main() {
    console.log(LOG, 'Content script loaded on', window.location.href);

    if (!isProductPage(window.location.href)) {
      console.log(LOG, 'Not a product page — skipping');
      return;
    }

    let panel: OverlayPanel | null = null;
    let lastReviewCount = -1;
    // Reviews fetched from /product-reviews/ pages (element: null, no DOM presence)
    let fetchedReviews: ParsedReview[] = [];
    let fetchAbortController: AbortController | null = null;

    /** Merge visible DOM reviews with previously fetched data-only reviews. */
    function mergedReviews(visible: ParsedReview[]): ParsedReview[] {
      const visibleIds = new Set(visible.map((r) => r.id));
      const extras = fetchedReviews.filter((r) => !visibleIds.has(r.id));
      return [...visible, ...extras];
    }

    const analyze = () => {
      try {
        const productData = parseProductPage(document);
        const visibleReviews = parseReviewList(document);

        console.log(LOG, `Parsed: rating=${productData.averageRating}, dist=${productData.starDistribution.length} stars, visible=${visibleReviews.length}, fetched=${fetchedReviews.length}`);

        // Don't re-run if nothing changed
        if (visibleReviews.length === lastReviewCount && panel) return;
        lastReviewCount = visibleReviews.length;

        const combined = mergedReviews(visibleReviews);
        const adjustedRating = calculateAdjustedRating(combined, productData.averageRating);
        const distribution = analyzeDistribution(productData.starDistribution);
        const timeline = analyzeTimeline(combined);

        if (panel) {
          panel.productData = productData;
          panel.reviews = combined;
          panel.adjustedRating = adjustedRating;
          panel.distribution = distribution;
          panel.timeline = timeline;
        } else {
          panel = mountPanel(productData, combined, adjustedRating, distribution, timeline);
          console.log(LOG, 'Panel mounted', panel);

          // Start background fetch once the panel is up
          const asin = extractAsin(window.location.href);
          if (asin) {
            fetchAbortController = new AbortController();
            panel.fetchStatus = 'loading';

            fetchMoreReviews(asin, fetchAbortController.signal, (batch) => {
              if (!panel) return;
              fetchedReviews = batch;
              const vis = parseReviewList(document);
              const all = mergedReviews(vis);
              panel.reviews = all;
              panel.adjustedRating = calculateAdjustedRating(all, productData.averageRating);
              panel.timeline = analyzeTimeline(all);
              panel.fetchedCount = batch.length;
            }).then(() => {
              if (panel) panel.fetchStatus = 'done';
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error(LOG, 'Error during analyze:', e);
      }
    };

    // Run immediately — histogram data is available at page load even without reviews
    analyze();

    // Poll for reviews appearing (Amazon loads them async via XHR)
    // Stops after 30 seconds or once reviews are stable
    let pollCount = 0;
    const MAX_POLLS = 60; // 30s at 500ms intervals

    const poll = setInterval(() => {
      pollCount++;
      const reviewCount = document.querySelectorAll('[data-hook="review"], div.review, [id^="customer_review-"]').length;

      if (reviewCount > 0 || pollCount >= MAX_POLLS) {
        if (reviewCount > 0) {
          analyze();
        }
        if (pollCount >= MAX_POLLS) {
          console.log(LOG, 'Poll timeout — stopping');
          clearInterval(poll);
        }
        // Once we have reviews, slow down to watching for changes
        if (reviewCount > 0 && pollCount < MAX_POLLS) {
          clearInterval(poll);
          watchForChanges(analyze);
        }
      }
    }, 500);

    window.addEventListener('beforeunload', () => {
      clearInterval(poll);
      fetchAbortController?.abort();
    });
  },
});

/** After initial reviews load, use MutationObserver to catch filter/page changes */
function watchForChanges(analyze: () => void) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(analyze, 400);
  });

  const reviewContainer =
    document.querySelector('#cm-cr-dp-review-list') ??
    document.querySelector('[data-hook="cr-dp-review-list"]') ??
    document.querySelector('#customer-reviews-content') ??
    document.querySelector('#reviewsMedley') ??
    document.body;

  observer.observe(reviewContainer, { childList: true, subtree: true });
}

/** Mount the overlay panel above the review section */
function mountPanel(
  productData: ProductPageData,
  reviews: ParsedReview[],
  adjustedRating: AdjustedRatingResult,
  distribution: DistributionAnalysis,
  timeline: TimelineAnalysis,
): OverlayPanel {
  const panel = document.createElement('hr-overlay-panel') as OverlayPanel;
  panel.productData = productData;
  panel.reviews = reviews;
  panel.adjustedRating = adjustedRating;
  panel.distribution = distribution;
  panel.timeline = timeline;

  // Try inserting above the review list section
  const reviewSectionCandidates = [
    '#cm-cr-dp-review-list',
    '[data-hook="cr-dp-review-list"]',
    '#customer-reviews-content',
    '#reviewsMedley',
    '#reviews-medley-footer',
    '[data-hook="reviews-medley-footer"]',
    '#customerReviews',
    '#arp-reviews-summary_feature_div',
  ];

  for (const sel of reviewSectionCandidates) {
    const target = document.querySelector(sel);
    if (target) {
      console.log(LOG, `Inserting panel before "${sel}"`);
      target.insertAdjacentElement('beforebegin', panel);
      return panel;
    }
  }

  // Fallback: insert after the product title / above the fold
  const fallbackCandidates = [
    '#ppd',
    '#dp-container',
    '#centerCol',
    'div[data-cel-widget="dpx_customer_review_feature_div"]',
  ];

  for (const sel of fallbackCandidates) {
    const target = document.querySelector(sel);
    if (target) {
      console.log(LOG, `Fallback: appending panel to "${sel}"`);
      target.appendChild(panel);
      return panel;
    }
  }

  console.log(LOG, 'Last resort: appending to body');
  document.body.appendChild(panel);
  return panel;
}
