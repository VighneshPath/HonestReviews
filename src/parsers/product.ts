/**
 * The canonical shape of product page data, shared across all site parsers.
 */

export interface StarDistribution {
  /** Star tier, 1–5 */
  stars: number;
  /** Percentage of all ratings at this tier (0–100) */
  percentage: number;
}

export interface ProductPageData {
  /** Overall average rating shown on the page, or null if not found */
  averageRating: number | null;
  /** Total number of ratings displayed, or null if not found */
  totalRatings: number | null;
  /** Star distribution histogram (empty array when unavailable) */
  starDistribution: StarDistribution[];
}
