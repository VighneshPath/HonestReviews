import type { ParsedReview } from './amazon/review-list.js';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Filter reviews not yet in `seen`, strip DOM element references (they belong
 * to a fetched document, not the current page), and register their IDs in `seen`.
 * Mutates `seen` as a side effect.
 */
export function deduplicateReviews(
  reviews: ParsedReview[],
  seen: Set<string>,
): ParsedReview[] {
  const fresh = reviews
    .filter((r) => !seen.has(r.id))
    .map((r) => ({ ...r, element: null }));
  fresh.forEach((r) => seen.add(r.id));
  return fresh;
}
