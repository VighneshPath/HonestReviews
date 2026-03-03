import type { ParsedReview } from '../parsers/amazon/review-list.js';
import { scoreReview } from './review-quality.js';

export type SortMode = 'most-informative' | 'most-helpful' | 'recent' | 'top-rated' | 'critical';

/**
 * Sort reviews by the given mode.
 * Returns a new array — does not mutate.
 */
export function sortReviews(reviews: ParsedReview[], mode: SortMode): ParsedReview[] {
  const sorted = [...reviews];

  switch (mode) {
    case 'most-informative':
      return sortByInformative(sorted);
    case 'most-helpful':
      return sorted.sort((a, b) => b.helpfulVotes - a.helpfulVotes);
    case 'recent':
      return sortByRecent(sorted);
    case 'top-rated':
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'critical':
      return sorted.sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5));
  }
}

function sortByInformative(reviews: ParsedReview[]): ParsedReview[] {
  const now = new Date();
  const scored = reviews.map((r) => ({ review: r, score: scoreReview(r, now).total }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.review);
}

function sortByRecent(reviews: ParsedReview[]): ParsedReview[] {
  return reviews.sort((a, b) => {
    const aTime = a.date?.getTime() ?? 0;
    const bTime = b.date?.getTime() ?? 0;
    return bTime - aTime;
  });
}

/**
 * Re-order the actual DOM elements to match the sorted review order.
 * Uses a document fragment to minimize reflows.
 */
export function applyDOMSort(sortedReviews: ParsedReview[]): void {
  // Only operate on reviews that are actually in the current DOM
  const domReviews = sortedReviews.filter((r) => r.element !== null) as Array<
    ParsedReview & { element: Element }
  >;
  if (domReviews.length === 0) return;

  const firstEl = domReviews[0].element;
  const parent = firstEl.parentElement;
  if (!parent) return;

  const allReviewIds = new Set(domReviews.map((r) => r.id));

  const fragment = document.createDocumentFragment();
  for (const review of domReviews) {
    fragment.appendChild(review.element);
  }

  const firstNonReview = findFirstNonReviewSibling(parent, allReviewIds);
  parent.insertBefore(fragment, firstNonReview);
}

function findFirstNonReviewSibling(parent: Element, reviewIds: Set<string>): Element | null {
  let foundReview = false;
  for (const child of Array.from(parent.children)) {
    if (reviewIds.has(child.id) || reviewIds.has(child.getAttribute('data-hook') ?? '')) {
      foundReview = true;
    } else if (foundReview) {
      return child;
    }
  }
  return null;
}
