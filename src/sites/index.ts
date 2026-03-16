/**
 * Site registry — the single place that knows which sites are supported.
 *
 * To add support for a new site:
 *   1. Create src/sites/<name>.ts  — implement createXxxAdapter(url) → SiteAdapter | null
 *   2. Import and add to SITE_FACTORIES below
 *   3. Export the site's MATCHES constant and add it to ALL_SITE_MATCHES
 *   4. Add ALL_SITE_MATCHES to the `matches` array in:
 *        - src/entrypoints/content.ts  (defineContentScript)
 *        - src/entrypoints/settings-relay.content.ts  (defineContentScript)
 *
 * content.ts and settings-relay.content.ts import only from this file —
 * they never reference individual site modules directly.
 */

import { createAmazonAdapter, AMAZON_MATCHES } from './amazon.js';
import { createFlipkartAdapter, FLIPKART_MATCHES } from './flipkart.js';
import type { SiteAdapter } from './adapter.js';

export type { SiteAdapter };

type AdapterFactory = (url: string) => SiteAdapter | null;

/**
 * Ordered list of site factories. Each factory inspects the URL and returns
 * an adapter if it recognises the site, or null to pass to the next factory.
 */
const SITE_FACTORIES: AdapterFactory[] = [
  createAmazonAdapter,
  createFlipkartAdapter,
];

/**
 * All URL match patterns for all supported sites.
 * Used as the `matches` array in WXT content script definitions.
 */
export const ALL_SITE_MATCHES = [...AMAZON_MATCHES, ...FLIPKART_MATCHES];

/**
 * Returns a SiteAdapter for the given URL, or null if no site recognises it.
 */
export function detectSite(url: string): SiteAdapter | null {
  for (const create of SITE_FACTORIES) {
    const adapter = create(url);
    if (adapter) return adapter;
  }
  return null;
}

/**
 * Returns true if the URL is a product page on any supported site.
 * Use this in the background script and popup — avoids importing individual site modules.
 */
export function isKnownProductPage(url: string): boolean {
  return detectSite(url) !== null;
}
