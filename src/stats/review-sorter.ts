import type { ParsedReview } from '../parsers/amazon/review-list.js';
import { scoreReview } from './review-quality.js';

export type SortMode = 'most-informative' | 'most-helpful' | 'recent' | 'top-rated' | 'critical';

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
