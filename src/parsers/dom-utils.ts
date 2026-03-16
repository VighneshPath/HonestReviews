/**
 * Generic DOM query helpers shared across all site parsers.
 *
 * Both helpers accept a list of CSS selectors ordered from most-preferred to
 * least-preferred. They try each in turn and return the first that finds a
 * match — making it straightforward to add fallback selectors when a site
 * redesigns its DOM without breaking existing ones.
 */

/**
 * Returns the first element matched by any selector in the list, or null.
 * Invalid selectors are silently skipped.
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
 * Returns all elements matched by the first selector in the list that finds anything.
 * Invalid selectors are silently skipped.
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
