import { isProductPage, extractAsin, AMAZON_MATCHES } from '../utils/amazon-url.js';
import { parseProductPage } from '../parsers/amazon/product-page.js';
import type { ProductPageData } from '../parsers/amazon/product-page.js';
import { parseReviewList } from '../parsers/amazon/review-list.js';
import type { ParsedReview } from '../parsers/amazon/review-list.js';
import { fetchMoreReviews } from '../parsers/amazon/review-fetcher.js';
import { calculateAdjustedRating } from '../stats/adjusted-rating.js';
import { analyzeDistribution } from '../stats/distribution-analysis.js';
import { analyzeTimeline } from '../stats/timeline-analysis.js';
import '../components/overlay-panel.js';
import type { OverlayPanel } from '../components/overlay-panel.js';
// Import only from types.ts — not settings.ts, which pulls in wxt/browser polyfill
// (incompatible with MAIN world; all storage access goes through the isolated-world relay).
import type { UserSettings } from '../storage/types.js';
import { DEFAULT_SETTINGS } from '../storage/types.js';

export default defineContentScript({
  matches: AMAZON_MATCHES,
  runAt: 'document_idle',
  world: 'MAIN',

  async main() {
    if (!isProductPage(window.location.href)) return;

    // All storage I/O is bridged through settings-relay.content.ts (isolated world)
    // via window.postMessage, since chrome.storage is unreliable in MAIN world.
    const settings = await requestSettings();
    if (!settings.enabled) return;

    let panel: OverlayPanel | null = null;
    let fetchedReviews: ParsedReview[] = [];
    let lastVisibleCount = -1;
    const fetchAbort = new AbortController();

    function merged(visible: ParsedReview[]): ParsedReview[] {
      const visibleIds = new Set(visible.map((r) => r.id));
      return [...visible, ...fetchedReviews.filter((r) => !visibleIds.has(r.id))];
    }

    function analyze() {
      try {
        const productData = parseProductPage(document);
        const visible = parseReviewList(document);
        if (visible.length === lastVisibleCount && panel) return;
        lastVisibleCount = visible.length;

        const all = merged(visible);
        const adjustedRating = calculateAdjustedRating(all, productData.averageRating, productData.starDistribution);
        const distribution = analyzeDistribution(productData.starDistribution);
        const timeline = analyzeTimeline(all);

        if (panel) {
          panel.productData = productData;
          panel.reviews = all;
          panel.adjustedRating = adjustedRating;
          panel.distribution = distribution;
          panel.timeline = timeline;
        } else {
          panel = mountPanel(productData, all, adjustedRating, distribution, timeline, settings);
          startFetch(panel, productData);
        }
      } catch (e) {
        console.error('[HonestReviews]', e);
      }
    }

    function startFetch(p: OverlayPanel, productData: ProductPageData) {
      const asin = extractAsin(window.location.href);
      if (!asin) return;

      p.fetchStatus = 'loading';
      fetchMoreReviews(asin, fetchAbort.signal, (batch) => {
        if (!panel) return;
        fetchedReviews = batch;
        const all = merged(parseReviewList(document));
        panel.reviews = all;
        panel.adjustedRating = calculateAdjustedRating(all, productData.averageRating, productData.starDistribution);
        panel.timeline = analyzeTimeline(all);
        panel.fetchedCount = batch.length;
      })
        .then(() => { if (panel) panel.fetchStatus = 'done'; })
        .catch(() => {});
    }

    analyze();

    // Amazon loads reviews via XHR after page load — poll until they appear
    let polls = 0;
    const poll = setInterval(() => {
      polls++;
      const hasReviews = document.querySelector('[data-hook="review"], [id^="customer_review-"]') !== null;
      if (hasReviews) {
        analyze();
        clearInterval(poll);
        watchForChanges(analyze);
      } else if (polls >= 60) {
        clearInterval(poll);
      }
    }, 500);

    // React to live settings changes relayed from settings-relay.content.ts.
    window.addEventListener('message', (e) => {
      if (e.source !== window || !e.data || e.data.type !== '__HR_SETTINGS__') return;

      const changes = e.data.payload as Partial<UserSettings>;

      if ('enabled' in changes) {
        if (!changes.enabled) {
          panel?.remove();
          panel = null;
          clearInterval(poll);
          fetchAbort.abort();
        } else if (!panel) {
          analyze();
        }
        return;
      }

      if (!panel) return;
      if ('showQualityBadges' in changes) panel.showQualityBadges = changes.showQualityBadges!;
      if ('autoCollapse' in changes) panel.collapsed = changes.autoCollapse!;
      if ('defaultSort' in changes) panel.defaultSort = changes.defaultSort!;
    });

    window.addEventListener('beforeunload', () => {
      clearInterval(poll);
      fetchAbort.abort();
    });
  },
});

/**
 * Ask the isolated-world relay for the current settings via window.postMessage.
 * Falls back to DEFAULT_SETTINGS after 2 s if the relay doesn't respond
 * (e.g. on Firefox where MAIN world runs in a separate JS context).
 */
function requestSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ ...DEFAULT_SETTINGS });
    }, 2000);

    function handler(e: MessageEvent) {
      if (e.source !== window || !e.data || e.data.type !== '__HR_SETTINGS_INIT__') return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(e.data.payload as UserSettings);
    }

    window.addEventListener('message', handler);
    window.postMessage({ type: '__HR_GET_SETTINGS__' }, '*');
  });
}

function watchForChanges(analyze: () => void) {
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const container =
    document.querySelector('#cm-cr-dp-review-list') ??
    document.querySelector('[data-hook="cr-dp-review-list"]') ??
    document.querySelector('#customer-reviews-content') ??
    document.body;

  new MutationObserver(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(analyze, 400);
  }).observe(container, { childList: true, subtree: true });
}

function mountPanel(
  productData: ProductPageData,
  reviews: ParsedReview[],
  adjustedRating: ReturnType<typeof calculateAdjustedRating>,
  distribution: ReturnType<typeof analyzeDistribution>,
  timeline: ReturnType<typeof analyzeTimeline>,
  settings: UserSettings,
): OverlayPanel {
  const panel = document.createElement('hr-overlay-panel') as OverlayPanel;
  panel.productData = productData;
  panel.reviews = reviews;
  panel.adjustedRating = adjustedRating;
  panel.distribution = distribution;
  panel.timeline = timeline;
  panel.collapsed = settings.autoCollapse;
  panel.showQualityBadges = settings.showQualityBadges;
  panel.defaultSort = settings.defaultSort;

  const reviewSectionSelectors = [
    '#cm-cr-dp-review-list',
    '[data-hook="cr-dp-review-list"]',
    '#customer-reviews-content',
    '#reviewsMedley',
    '#reviews-medley-footer',
    '[data-hook="reviews-medley-footer"]',
    '#customerReviews',
    '#arp-reviews-summary_feature_div',
  ];

  const containerSelectors = ['#ppd', '#dp-container', '#centerCol'];

  for (const sel of reviewSectionSelectors) {
    const el = document.querySelector(sel);
    if (el) { el.insertAdjacentElement('beforebegin', panel); return panel; }
  }
  for (const sel of containerSelectors) {
    const el = document.querySelector(sel);
    if (el) { el.appendChild(panel); return panel; }
  }

  document.body.appendChild(panel);
  return panel;
}
