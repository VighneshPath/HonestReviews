import { detectSite, ALL_SITE_MATCHES } from '../sites/index.js';
import type { ParsedReview } from '../parsers/review.js';
import type { ProductPageData, StarDistribution } from '../parsers/product.js';
import { calculateAdjustedRating } from '../stats/adjusted-rating.js';
import { analyzeDistribution } from '../stats/distribution-analysis.js';
import { analyzeTimeline } from '../stats/timeline-analysis.js';
import '../components/overlay-panel.js';
import type { OverlayPanel } from '../components/overlay-panel.js';
// Import only from storage/types.ts — not storage/settings.ts, which pulls in the
// wxt/browser polyfill (incompatible with MAIN world). All storage I/O is bridged
// through settings-relay.content.ts via window.postMessage.
import type { UserSettings, PanelPosition } from '../storage/types.js';
import { DEFAULT_SETTINGS } from '../storage/types.js';
import type { ReviewSignal } from '../stats/review-quality.js';

export default defineContentScript({
  matches: ALL_SITE_MATCHES,
  runAt: 'document_idle',
  world: 'MAIN',

  async main() {
    const site = detectSite(window.location.href);
    if (!site) return;

    // All storage I/O is bridged through settings-relay.content.ts (isolated world)
    // via window.postMessage, since chrome.storage is unreliable in MAIN world.
    const settings = await requestSettings();
    if (!settings.enabled) return;

    let panel: OverlayPanel | null = null;
    let fetchedReviews: ParsedReview[] = [];
    let lastVisibleCount = -1;
    const fetchAbort = new AbortController();

    // Merge page-visible reviews with background-fetched ones, keeping visible first
    // and deduplicating by ID (visible reviews take precedence — they have a DOM element).
    function mergeReviews(visible: ParsedReview[]): ParsedReview[] {
      const visibleIds = new Set(visible.map((r) => r.id));
      return [...visible, ...fetchedReviews.filter((r) => !visibleIds.has(r.id))];
    }

    function analyze() {
      try {
        // Panel is fixed to document.body — reconnect if somehow detached.
        if (panel && !panel.isConnected) {
          document.body.appendChild(panel);
        }


        const productData = site.parseProductPage(document);
        const visible = site.parseReviewList(document);
        if (visible.length === lastVisibleCount && panel) return;
        lastVisibleCount = visible.length;

        const all = mergeReviews(visible);
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
          panel = mountPanel(productData, all, adjustedRating, distribution, timeline, settings, site.reviewSignals);
          startFetch(panel, productData);
        }
      } catch (e) {
        console.error('[HonestReviews]', e);
      }
    }

    function startFetch(p: OverlayPanel, productData: ProductPageData) {
      const fetchId = site.getReviewsFetchId();
      if (!fetchId) {
        p.fetchStatus = 'done';
        return;
      }

      p.fetchStatus = 'loading';
      site.fetchReviews(fetchId, fetchAbort.signal, (batch, _tier, histogram) => {
        if (!panel) return;
        fetchedReviews = batch;

        // If the fetcher returned a histogram (Flipkart gets it from the reviews page),
        // update both the distribution analysis and productData.starDistribution so the
        // histogram bars also reflect the more accurate fetched data.
        if (histogram && histogram.length > 0) {
          panel.distribution = analyzeDistribution(histogram);
          panel.productData = { ...productData, starDistribution: histogram };
        }
        const effectiveDist = (histogram && histogram.length > 0)
          ? histogram
          : productData.starDistribution;

        const all = mergeReviews(site.parseReviewList(document));
        panel.reviews = all;
        panel.adjustedRating = calculateAdjustedRating(all, productData.averageRating, effectiveDist);
        panel.timeline = analyzeTimeline(all);
        panel.fetchedCount = batch.length;
      })
        .then(() => { if (panel) panel.fetchStatus = 'done'; })
        .catch(() => {});
    }

    analyze();

    // Reviews may load via XHR after page load — poll until they appear, then hand off
    // to the MutationObserver for ongoing updates.
    let polls = 0;
    const reviewQuery = site.reviewContainerSelectors.join(', ');
    const poll = setInterval(() => {
      polls++;
      if (document.querySelector(reviewQuery) !== null || polls >= 60) {
        clearInterval(poll);
        analyze();
        watchForChanges(analyze, site.reviewContainerSelectors);
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
      if ('panelPosition' in changes) applyPanelPosition(panel, changes.panelPosition!);
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

function watchForChanges(analyze: () => void, reviewContainerSelectors: string[]) {
  let debounce: ReturnType<typeof setTimeout> | null = null;

  let container: Element = document.body;
  for (const sel of reviewContainerSelectors) {
    const el = document.querySelector(sel);
    if (el) { container = el; break; }
  }

  new MutationObserver(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(analyze, 400);
  }).observe(container, { childList: true, subtree: true });
}

function applyPanelPosition(panel: OverlayPanel, position: PanelPosition) {
  const isBottom = position.startsWith('bottom');
  const isRight  = position.endsWith('right');
  panel.style.top    = isBottom ? '' : '20px';
  panel.style.bottom = isBottom ? '20px' : '';
  panel.style.left   = isRight  ? '' : '20px';
  panel.style.right  = isRight  ? '20px' : '';
}

function mountPanel(
  productData: ProductPageData,
  reviews: ParsedReview[],
  adjustedRating: ReturnType<typeof calculateAdjustedRating>,
  distribution: ReturnType<typeof analyzeDistribution>,
  timeline: ReturnType<typeof analyzeTimeline>,
  settings: UserSettings,
  reviewSignals?: ReadonlySet<ReviewSignal>,
): OverlayPanel {
  const panel = document.createElement('hr-overlay-panel') as OverlayPanel;
  panel.productData      = productData;
  panel.reviews          = reviews;
  panel.adjustedRating   = adjustedRating;
  panel.distribution     = distribution;
  panel.timeline         = timeline;
  panel.collapsed        = settings.autoCollapse;
  panel.showQualityBadges = settings.showQualityBadges;
  panel.defaultSort      = settings.defaultSort;
  if (reviewSignals) panel.reviewSignals = reviewSignals;

  // Fixed floating panel — lives in document.body outside any site's managed DOM,
  // so it is never evicted by React or other framework reconcilers.
  panel.style.cssText = [
    'position: fixed',
    'width: 380px',
    'max-height: 80vh',
    'overflow-y: auto',
    'z-index: 2147483647',
  ].join('; ');
  applyPanelPosition(panel, settings.panelPosition);

  document.body.appendChild(panel);
  return panel;
}
