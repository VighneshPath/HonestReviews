/**
 * All Amazon CSS selectors centralized here.
 * Each selector is an array of fallbacks — primary first, alternatives after.
 * When Amazon changes their DOM, update THIS FILE ONLY.
 *
 * Last verified: 2026-03 against amazon.in
 */

// Re-export shared DOM query helpers so existing Amazon parser imports keep working.
export { queryFirst, queryAll } from '../dom-utils.js';

export const SELECTORS = {
  histogram: {
    /**
     * Amazon now encodes the star/percentage data in aria-label attributes
     * on anchor elements. Format: "56 percent of reviews have 5 stars"
     * This replaces the old tr.a-histogram-row table approach.
     */
    ariaLinks: [
      'a[aria-label*="percent of reviews"]',
      'a[aria-label*="percent have"]',
    ],
    /** Legacy table row selectors (older Amazon layouts) */
    rows: [
      'tr.a-histogram-row',
      '#histogramTable tr',
      '[data-hook="histogram-row"]',
    ],
    percentage: [
      'td.a-text-right a',
      '.a-meter-bar + .a-text-right a',
      'td:last-child a',
    ],
    starLabel: [
      'td:first-child .a-size-base',
      'td:first-child a',
      '.a-histogram-row__label',
    ],
  },

  product: {
    averageRating: [
      '[data-hook="rating-out-of-text"]',
      '[data-hook="average-star-rating"] .a-icon-alt',
      '#averageCustomerReviews .a-icon-alt',
      '#acrPopover .a-icon-alt',
    ],
    totalRatings: [
      '[data-hook="total-review-count"]',
      '#acrCustomerReviewText',
      '#averageCustomerReviews span[data-hook="total-review-count"]',
    ],
    histogramSection: [
      '#histogramTable',
      '#reviewSummary',
    ],
  },

  review: {
    container: [
      '[data-hook="review"]',
      '[id^="customer_review-"]',
      '[id^="customer_review_foreign-"]',
      'div.review',
    ],
    rating: [
      '[data-hook="review-star-rating"] .a-icon-alt',
      '[data-hook="cmps-review-star-rating"] .a-icon-alt',
      '.review-rating .a-icon-alt',
    ],
    /**
     * Title: skip the embedded star-rating icon text (.a-icon-alt) and
     * the letter-space span. The actual title is the last plain <span>.
     */
    title: [
      '[data-hook="review-title"] span:not(.a-icon-alt):not(.a-letter-space)',
      '[data-hook="review-title"] > span:last-of-type',
      '[data-hook="review-title"]',
    ],
    /**
     * Body text. Some reviews are video-only so the span may be empty.
     * review-collapsed contains the full text for truncated reviews.
     */
    body: [
      '[data-hook="review-body"] span.cr-original-review-content',
      'span[data-hook="review-collapsed"]',
      '[data-hook="review-body"] span:not(:empty)',
      '[data-hook="review-body"]',
      '.review-text-content span',
      '.review-text span',
    ],
    verifiedBadge: [
      '[data-hook="avp-badge-linkless"]',
      '[data-hook="avp-badge"]',
      'span.a-size-mini.a-color-state',
    ],
    date: [
      '[data-hook="review-date"]',
      '.review-date',
    ],
    helpfulVotes: [
      '[data-hook="helpful-vote-statement"]',
      '.cr-vote-text',
    ],
    images: [
      '[data-hook="review-image-tile"]',
      '[data-hook="image-popover"]',
      '.review-image-tile',
      '[data-hook="review-image-container"] img',
    ],
    reviewerName: [
      '.a-profile-name',
    ],
  },

  reviewList: {
    container: [
      '#cm-cr-dp-review-list',
      '[data-hook="cr-dp-review-list"]',
      '#customer-reviews-content',
    ],
    pagination: [
      '[data-hook="cr-filter-info-review-count"]',
      '#filter-info-section',
    ],
  },
} as const;

