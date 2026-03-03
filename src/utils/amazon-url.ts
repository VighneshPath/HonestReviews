/**
 * URL utilities for detecting Amazon product pages.
 */

const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.ca',
  'amazon.com.au',
  'amazon.co.jp',
  'amazon.in',
];

/**
 * Check if a URL is an Amazon domain.
 */
export function isAmazonUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return AMAZON_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL is an Amazon product page (has /dp/ or /gp/product/).
 */
export function isProductPage(url: string): boolean {
  if (!isAmazonUrl(url)) return false;
  try {
    const { pathname } = new URL(url);
    return /\/dp\/[A-Z0-9]{10}/.test(pathname) ||
           /\/gp\/product\/[A-Z0-9]{10}/.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Extract the ASIN from an Amazon product URL.
 */
export function extractAsin(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const dpMatch = pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (dpMatch?.[1]) return dpMatch[1];
    const gpMatch = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
    if (gpMatch?.[1]) return gpMatch[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if the current page has the review section visible.
 * Amazon renders reviews via AJAX on product pages.
 */
export function hasReviewSection(doc: Document): boolean {
  return (
    doc.querySelector('#customer-reviews-content') !== null ||
    doc.querySelector('#cm-cr-dp-review-list') !== null ||
    doc.querySelector('[data-hook="review"]') !== null
  );
}
