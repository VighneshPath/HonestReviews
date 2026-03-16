import type { ParsedReview } from './amazon/review-list.js';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Given a batch of freshly parsed reviews:
 *   1. Discard any whose ID is already in `seen` (cross-page deduplication).
 *   2. Set `element` to null — fetched elements belong to a temporary Document,
 *      not the live page DOM, so keeping the reference would be a memory leak.
 *   3. Register the new IDs in `seen` for the next batch.
 *
 * Mutates `seen` in place. Designed to be called once per fetched page.
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
