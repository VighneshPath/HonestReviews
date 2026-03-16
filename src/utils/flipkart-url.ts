export const FLIPKART_MATCHES = [
  '*://*.flipkart.com/*',
  '*://flipkart.com/*',
];

export function isFlipkartUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'flipkart.com' || hostname.endsWith('.flipkart.com');
  } catch {
    return false;
  }
}

/**
 * Flipkart product pages have paths like:
 *   /product-name/p/itm4720d5fd11eb3
 */
export function isFlipkartProductPage(url: string): boolean {
  if (!isFlipkartUrl(url)) return false;
  try {
    const { pathname } = new URL(url);
    return /\/p\/itm[a-z0-9]+/i.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Extract the product ID (itm…) from either a product page or reviews page URL.
 */
export function extractFlipkartPid(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    // Matches /p/itm... and /product-reviews/itm...
    return pathname.match(/\/(?:p|product-reviews)\/(itm[a-z0-9]+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Extract the full reviews page base URL from the product page DOM.
 *
 * Prefers a DOM link (preserves the long slug and pid exactly as Flipkart
 * uses them). Falls back to URL construction by replacing /p/ with
 * /product-reviews/ in the current page URL — same approach Amazon uses
 * to construct /product-reviews/{asin} from the product page.
 */
export function extractFlipkartReviewsUrl(doc: Document, pid: string): string | null {
  // DOM-based: most accurate — preserves slug and pid as Flipkart expects
  const link = doc.querySelector(`a[href*="product-reviews/${pid}"]`);
  if (link) {
    const href = link.getAttribute('href') ?? '';
    try {
      const url = new URL(href, 'https://www.flipkart.com');
      const pidParam = url.searchParams.get('pid');
      return url.origin + url.pathname + (pidParam ? `?pid=${pidParam}` : '');
    } catch { /* fall through */ }
  }

  // URL-based fallback: construct reviews URL from the current product page URL.
  // Product page:  /slug/p/itmXXX?pid=YYY
  // Reviews page:  /slug/product-reviews/itmXXX?pid=YYY
  return constructFlipkartReviewsUrl(window.location.href);
}

/**
 * Construct the reviews base URL directly from a product page URL by
 * replacing /p/ with /product-reviews/ — no DOM access needed.
 * Returns null if the URL doesn't match the expected product-page pattern.
 */
export function constructFlipkartReviewsUrl(productUrl: string): string | null {
  try {
    const u = new URL(productUrl);
    const newPathname = u.pathname.replace(/\/p\/(itm[a-z0-9]+)/i, '/product-reviews/$1');
    if (newPathname === u.pathname) return null;
    const pidParam = u.searchParams.get('pid');
    return u.origin + newPathname + (pidParam ? `?pid=${pidParam}` : '');
  } catch {
    return null;
  }
}
