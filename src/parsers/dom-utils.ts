/**
 * Generic DOM query helpers for resilient, fallback-based element selection.
 * Shared across all site parsers (Amazon, Flipkart, etc.).
 */

/**
 * Try each selector in an array, returning the first matching element.
 */
export function queryFirst(
  root: Document | Element,
  selectors: readonly string[],
): Element | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch {
      // Invalid selector — skip
    }
  }
  return null;
}

/**
 * Try each selector in an array, returning all matches from the first working selector.
 */
export function queryAll(
  root: Document | Element,
  selectors: readonly string[],
): Element[] {
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch {
      // Invalid selector — skip
    }
  }
  return [];
}
