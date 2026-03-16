/**
 * The canonical shape of a parsed review, shared across all site parsers.
 *
 * Amazon and Flipkart parsers both produce this interface so that stats,
 * components, and content.ts never need to know which site they're on.
 */
export interface ParsedReview {
  /** Stable ID for deduplication across fetches */
  id: string;
  /** Live DOM element, or null for reviews fetched from other pages */
  element: Element | null;
  rating: number | null;
  title: string;
  body: string;
  isVerified: boolean;
  date: Date | null;
  /** Raw date string as it appeared on the page */
  dateText: string;
  helpfulVotes: number;
  hasImages: boolean;
  /** CDN URLs of review photo thumbnails (empty if none) */
  images: string[];
  reviewerName: string;
  /** Body character count — pre-computed for quality scoring */
  bodyLength: number;
}
