import { SELECTORS, queryFirst, queryAll } from './selectors.js';
import { parseRating, parseHelpfulVotes, parseReviewDate, textContent } from './utils.js';
import type { ParsedReview } from '../review.js';

export type { ParsedReview };

export function parseReviewList(doc: Document): ParsedReview[] {
  const containers = queryAll(doc, SELECTORS.review.container);
  return containers.map((el, index) => parseReview(el, index));
}

function parseReview(el: Element, index: number): ParsedReview {
  const id = el.id || `review-${index}`;

  const ratingEl = queryFirst(el, SELECTORS.review.rating);
  const rating = ratingEl ? parseRating(textContent(ratingEl)) : null;

  const title = parseTitleText(el);
  const body = parseBodyText(el);

  const verifiedEl = queryFirst(el, SELECTORS.review.verifiedBadge);
  const isVerified = verifiedEl !== null;

  const dateEl = queryFirst(el, SELECTORS.review.date);
  const dateText = textContent(dateEl);
  const date = parseReviewDate(dateText);

  const helpfulEl = queryFirst(el, SELECTORS.review.helpfulVotes);
  const helpfulVotes = helpfulEl ? parseHelpfulVotes(textContent(helpfulEl)) : 0;

  const imageEls = queryAll(el, SELECTORS.review.images);
  const images = imageEls
    .map(extractImageUrl)
    .filter((url): url is string => !!url && url.startsWith('https://'))
    .map((url) => url.replace(/\._SL\d+_/g, '._SL200_')); // upsize thumbnails
  const hasImages = images.length > 0;

  const nameEl = queryFirst(el, SELECTORS.review.reviewerName);
  const reviewerName = textContent(nameEl);

  return {
    id,
    element: el,
    rating,
    title,
    body,
    isVerified,
    date,
    dateText,
    helpfulVotes,
    hasImages,
    images,
    reviewerName,
    bodyLength: body.length,
  };
}

function extractImageUrl(el: Element): string | null {
  // Direct <img> element
  if (el.tagName === 'IMG') {
    return el.getAttribute('src') || el.getAttribute('data-src') || null;
  }
  // Container holding a nested <img> (e.g. div[data-hook="review-image-container"])
  const img = el.querySelector('img');
  if (img) {
    return img.getAttribute('src') || img.getAttribute('data-src') || null;
  }
  return null;
}

/**
 * Extract the title text, skipping the embedded star-rating icon.
 *
 * Amazon's title element contains:
 *   <i data-hook="review-star-rating"><span class="a-icon-alt">5.0 out of 5 stars</span></i>
 *   <span class="a-letter-space"></span>
 *   <span>Actual title text here</span>
 *
 * We clone the element, remove the <i> tag, then grab the remaining text.
 */
function parseTitleText(el: Element): string {
  const titleEl = queryFirst(el, SELECTORS.review.title);
  if (!titleEl) return '';

  // Clone so we can mutate without affecting the live DOM
  const clone = titleEl.cloneNode(true) as Element;

  // Remove star rating icon and letter-space span
  clone.querySelectorAll('i, .a-letter-space').forEach((n) => n.remove());

  const text = clone.textContent?.trim() ?? '';

  // If the result still starts with a rating pattern, strip it
  return text.replace(/^\d+(\.\d+)?\s+out\s+of\s+\d+\s+stars?\s*/i, '').trim();
}

/**
 * Extract review body text. Some reviews are video-only (body span is empty),
 * so we try multiple selectors and filter out the media-error placeholder text.
 */
function parseBodyText(el: Element): string {
  const candidates = SELECTORS.review.body;

  for (const sel of candidates) {
    try {
      const bodyEl = el.querySelector(sel);
      if (!bodyEl) continue;

      const text = bodyEl.textContent?.trim() ?? '';

      // Skip empty or media-error placeholder text
      if (!text || text.toLowerCase().includes('media could not be loaded')) continue;

      // Skip JSON analytics blobs Amazon sometimes injects into hidden spans
      if (text.startsWith('{') || text.startsWith('[')) continue;

      return text;
    } catch {
      // Invalid selector — skip
    }
  }

  return '';
}
